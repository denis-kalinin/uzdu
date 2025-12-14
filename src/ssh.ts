import { Client, ConnectConfig, SFTPWrapper, TransferOptions } from "ssh2";
import fs from "fs";
import path from "path";
import { getEnvironment, initEnvironment, listFiles, resolvePath, safeIndex } from "./utils";
import deepmerge from "deepmerge";

export type SshConfig = ConnectConfig & { password: string; privateKey?: undefined } | { password?: undefined ; privateKey: Buffer | string };

export async function upload(source: string, sftpUrlPath: string, sshConfig: SshConfig) {
  await new Promise<void>((resolve, reject) => {
    fs.stat(source, async (err, stats) => {
      if(stats.isSymbolicLink()){
        reject(new Error(`${source} is symlink`));
      } else {
        const sshConnection = await connect(sshConfig);
        try{
          const files = await listFiles(source);
          const _destination = sftpUrlPath.replace(/\/+$/, "").replace(/^~/, ".");
          const _source = source.replace(/\/+$/, "");
          await mkdirs(sshConnection, _destination, files);
          await uploadFiles(files, _source, _destination, sshConnection);
          resolve();
        } catch (e) {
          console.error("SFTP error", e);
          reject(e);
        } finally {
          sshConnection.destroy();
        }
      }
    });
  });
}

const transferOptions: TransferOptions = {
  concurrency: 2,
  chunkSize: 65536,
  //step: (totalTransferred, chunk, total) => console.log(`Uploaded ${totalTransferred} bytes out of ${total}`)
}

async function mkdirs(sshConnection: Client, destination: string, sources: Record<string, string>){
  const fileMap = getDirMap(sources);
  const makeDirs = getMakeDirs(fileMap, destination);
  const commands = makeDirs ? makeDirs.map((dir) => `mkdir -p "${dir}"`) : [`mkdir -p "${destination}"`];
  const commandLine = commands.length > 1 ? commands.join(";") : commands[0];
  await new Promise<void>((res, rej) => {
    sshConnection.exec(commandLine, {}, (err, channel) => {
      if (err) {
        console.error("mkdir error", err);
        rej(new Error(`failed: mkdir -p ... : ${err}`));
      } else {
        channel.on('exit', (code: number, signal: number) => {
          if(code != 0) rej(new Error(`Exit code: ${code} for "mkdir -p ..."`));
          else res();
        })
      }
    });
  });
}

function _uploadFile(source: string, destination: string, sftp: SFTPWrapper){
  return new Promise<void>((resolve,reject) => {
    sftp.stat(destination, async (err, stats) => {
      if(err) {
        sftp.fastPut(source, destination,{}, (err) => { if(err) reject(err); else resolve(); });
      } else if (stats.isFile()) {
        sftp.fastPut(source, destination,{}, (err) => {if(err) reject(err); else resolve();});
      } else if(stats.isDirectory()) {
        const f = path.basename(source);
        reject(new Error(`Overwriting directory ${destination} with the file ${f} is not allowed. Remove the directory manually.`));
      } else {
        reject(new Error("Remote path is symlink"));
      }
    });
  });
}

function uploadFiles(sourceFiles: Record<string, string>, source: string, destination: string, sshConnection: Client){
  return new Promise<void>((resolve, reject) => {
    sshConnection.sftp(async (err, sftp) => {
      if(err){
        console.error("uploadFiles error");
        reject(err);
      } else {
        if(Object.keys(sourceFiles).length == 1){
          const lstat = fs.lstatSync(source);
          if(lstat.isFile()){
            const dest = path.join(destination, sourceFiles[0]).replace(/\\/g, '/');
            const src = source;
            console.log(`Uploading file ${src} => ${dest}`);
            await _uploadFile(src, dest, sftp)
              .then(() => resolve())
              .catch((e) => {
                console.error(src);
                reject(e);
              });
            return;        
          }
        }
        let sourceDir = source;
        console.info("sourcing directory", sourceDir);
        const lstat = fs.lstatSync(source);
        if(lstat.isSymbolicLink()){
          sourceDir = fs.readlinkSync(source);
          console.info(`${source} ==> ${sourceDir}`);
        }
        const promises: Promise<void>[] = [];
        Object.entries(sourceFiles).map(([baseName, absPath]) => {
          const dest = path.join(destination, baseName).replace(/\\/g, '/');
          console.log(`Uploading ${absPath} => ${dest}`);
          const promise = new Promise<void>((res, rej) => {
            _uploadFile(absPath, dest, sftp)
              .then(() => res())
              .catch((e) => {
                console.error(absPath);
                console.error(e);
                rej(e);
              });
          });
          promises.push(promise);
        });
        await Promise.all(promises);
        resolve();
      }
    });
  });
}

async function connect(sshConfig: SshConfig){
  const conn = new Client();
  try {
    return await new Promise<Client>((resolve, reject) => {
      conn
        .on("error", (e) => {
          reject(new Error(`Target host error: ${e}`));
        })
        .on("ready", () => {
          resolve(conn);
        })
        .connect({
          timeout: 99,
          port: 22,
          algorithms: {
            cipher: [
              "aes128-ctr", "aes192-ctr", "aes256-ctr", "aes256-cbc","aes128-cbc"
              //"aes128-gcm", ////"aes128-gcm@openssh.com", //"aes256-gcm", ////"aes256-gcm@openssh.com", ////"aes192-cbc",
            ]
          },
          ...sshConfig
        })
    });
  } catch (e) {
    console.error("Connection failed", e);
    conn.destroy();
    throw e;
  }
}

type FileMapEntry = { [key:string]: false | FileMapEntry };
export function getMakeDirs(fileMap: FileMapEntry, destination?: string): false | string[] {
  const kv: [string, false | FileMapEntry][] = Object.entries(fileMap);
  const hasSubdirs = kv.some((keyVal) => !!keyVal[1]);
  if(!hasSubdirs) return false;
  const subdirs = kv.reduce<string[]>((acc, curr) => {
    if(curr[1]){
      const res = getMakeDirs(curr[1]);
      const prefix = destination ? [destination, curr[0]].join("/") : curr[0];
      if (res) {
        const pathes = res.map((apath) => [prefix, apath].join("/"));
        acc.push(...pathes);
      } else acc.push(prefix);
    }
    return acc;
  }, []);
  return subdirs;
}
export function getDirMap(files: Record<string, string>): FileMapEntry {
  let fileMap: FileMapEntry = {};
  Object.keys(files).map((file) => {
    const leaf = getFileMap(file);
    fileMap = deepmerge(fileMap, leaf);
  });
  return fileMap;
}
function getFileMap(file: string): FileMapEntry {
  let theFile = file;
  if( file.indexOf("/") == 0 ) theFile = file.substring(1);
  const parts = theFile.split("/");
  if(parts.length == 1) return { [parts[0]]: false };
  else {
    const aFile = path.join(...parts.slice(1)).replace(/\\/g, '/');
    const fileMapEntry = getFileMap(aFile);
    return { [parts[0]]: fileMapEntry };
  }
}
export function getSshConfig(ssh_server: string, options: any): SshConfig {
  if(options.dotenv){
    const theEnv = getEnvironment(options.dotenv);
    initEnvironment(theEnv);
  }
  const userAndSshUrl = ssh_server.split("@");
  if(userAndSshUrl.length==1) throw new Error("ssh_server address must specify username, e.g. root@example.com");
  const username = userAndSshUrl[0];
  const hostParts = userAndSshUrl[1].split(":");
  const host = hostParts[0];
  const sPort = safeIndex(hostParts, 1) || 22;
  const port = Number(sPort);
  const conConfig: Pick<ConnectConfig, "host"|"port"|"username"> = { host, port, username };
  const uzduKeyPath = options.targetKeyPath || process.env.UZDU_SSH_KEY_PATH;
  const uzduKey = options.targetKey || process.env.UZDU_SSH_KEY;
  const uzduPassword = options.targetPassword || process.env.UZDU_SSH_PASSWORD;
  let password: string | undefined = undefined;
  let privateKey: Buffer | string | undefined = uzduKey;
  if(!privateKey){
    if(uzduKeyPath){
      const resolvedKeyPath = resolvePath(options.targetKey);
      try {
        privateKey = fs.readFileSync( resolvedKeyPath );
      } catch (e) {
        throw new Error(`Not found private Key file ${resolvedKeyPath}`);
      }
    } else {
      if(!uzduPassword) throw new Error("Either --targetPassword, --targetKeyPath or --targetKey should be specified");
      password = uzduPassword;
    }
  }
  const authConfig: SshConfig = password ? {
    password: password as string,
  } : {
    privateKey: privateKey as Buffer | string
  };
  const sshConfig: SshConfig = { ...conConfig, ...authConfig };
  return sshConfig;
}