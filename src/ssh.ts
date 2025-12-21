import { Client, ConnectConfig, SFTPWrapper, TransferOptions } from "ssh2";
import fs from "fs";
import path from "path";
import { getEnvironment, initEnvironment, listFiles, resolvePath, safeIndex } from "./utils";
import deepmerge from "deepmerge";

export type SshCredentials = { password: string; privateKey?: undefined } | { password?: undefined ; privateKey: Buffer | string };

export async function upload(source: string, sftpUrl: string, options?: { privateKeyPath?: string, dotenv?: string } ) {
  await new Promise<void>((resolve, reject) => {
    fs.stat(source, async (err, stats) => {
      if(err) {
        reject(err);
        return;
      }
      if(stats.isSymbolicLink()){
        reject(new Error(`${source} is symlink`));
      } else {
        let sshConnection;
        try {
          const _connectConfig = getConnectConfig(sftpUrl);
          const _sshCredentials = _connectConfig.password ? undefined : getCredentials(options);
          const connectConfig: ConnectConfig = { ..._connectConfig, ..._sshCredentials};
          sshConnection = await connect(connectConfig);
          const files = await listFiles(source);
          const destination = getRemoteDestination(sftpUrl);
          const _source = source.replace(/\/+$/, "");
          await mkdirs(sshConnection, destination, files);
          await uploadFiles(files, _source, destination, sshConnection);
          resolve();
        } catch (e) {
          //console.error("SFTP error", e);
          reject(e);
        } finally {
          sshConnection?.destroy();
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
            const dest = path.join(destination, Object.keys(sourceFiles)[0]).replace(/\\/g, '/');
            const src = source;
            //console.trace(`Uploading file ${src} => ${dest}`);
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
        //console.info("sourcing directory", sourceDir);
        const lstat = fs.lstatSync(source);
        if(lstat.isSymbolicLink()){
          sourceDir = fs.readlinkSync(source);
          //console.info(`${source} ==> ${sourceDir}`);
        }
        const promises: Promise<void>[] = [];
        Object.entries(sourceFiles).map(([baseName, absPath]) => {
          const dest = path.join(destination, baseName).replace(/\\/g, '/');
          //console.trace(`Uploading ${absPath} => ${dest}`);
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

async function connect(sshConfig: ConnectConfig){
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
          timeout: 5,
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
/**
 * 
 * @param options 
 * @returns 
 */
export function getCredentials(options?: { privateKeyPath?: string, dotenv?: string }) {
  if(options?.dotenv){
    const theEnv = getEnvironment(options.dotenv);
    initEnvironment(theEnv);
  }
  const uzduKey = process.env.UZDU_SSH_KEY;
  let password: string | undefined = undefined;
  let privateKey: Buffer | string | undefined = uzduKey;
  if(!privateKey){
    const uzduKeyPath = options?.privateKeyPath || process.env.UZDU_SSH_KEY_PATH;
    if(uzduKeyPath){
      const resolvedKeyPath = resolvePath(uzduKeyPath);
      try {
        privateKey = fs.readFileSync( resolvedKeyPath );
      } catch (e) {
        throw new Error(`Not found private Key file ${resolvedKeyPath}`);
      }
    } else {
      const uzduPassword = process.env.UZDU_SSH_PASSWORD;
      if(!uzduPassword) throw new Error("Specify password in SFTP URL. Otherwise consider using one of environment variables: UZDU_SSH_KEY_PATH, UZDU_SSH_KEY, UZDU_SSH_PASSWORD");
      password = uzduPassword;
    }
  }
  const authConfig = password ? {
    password: password as string,
  } : {
    privateKey: privateKey as Buffer | string
  };
  return authConfig;
}
//const regexPattern = "^sftp:\\/\\/(?:(?<username>[\\w\\.\\-]{1,32})(?::(?<password>.+))?@)?(?:(?<host>[\\w\\.\\-]+)|\\[(?<ipv6>[\\d:]+)\\])(?::(?<port>\\d{1,5}))?\\/(?<path>.*)$";
const sftpUrlRegex = /^sftp:\/\/(?:(?<username>[\w\.\-]{1,32})(?::(?<password>.+))?@)?(?:(?<host>[\w\.\-]+)|\[(?<ipv6>[\d:]+)\])(?::(?<port>\d{1,5}))?\/(?<path>.*)$/g;
/**
 * Get SSH ConnectionConfig from sftp URL.
 * The general format for the URL is:
 * `sftp://[user[:password]@]host[:port]/path/to/file`
 * 
 * Examples:
 * ```
 * sftp://ubuntu:pa55w0rd@example.com/opt/file
 * sftp://root@[2001:db8::5]:222/opt/file
 * sftp://203.0.113.5/opt/file
 * ```
 * @param sftpUrl
 * 
 * @throws Wrong URL: host or ivp6 is not specified
 */
export function getConnectConfig(sftpUrl: string): ConnectConfig {
  //const regex = new RegExp(regexPattern, "g");
  //const execArray = regex.exec(sftpUrl);
  sftpUrlRegex.lastIndex = 0;
  const execArray = sftpUrlRegex.exec(sftpUrl);
  const { groups } = execArray ?? {};
  const host = groups?.host || groups?.ipv6;
  if(!host) throw new Error(`Wrong URL "${sftpUrl}": host or ivp6 is not specified`);
  const username = groups?.username;
  const password = groups?.password;
  const _port = parseInt(groups.port)
  const port = isNaN(_port) ? undefined : _port;
  const connectConfig = { username, password, host, port };
  return connectConfig;
}
/**
 * 
 * @param sftpUrl 
 * @returns path on remote ssh server
 * @throws Wrong sfpt URL
 * @throws Wrong URL: path is not specified
 */
export function getRemoteDestination(sftpUrl: string): string {
  //const regex = new RegExp(regexPattern, "g");
  //const execArray = regex.exec(sftpUrl);
  sftpUrlRegex.lastIndex = 0;
  const execArray = sftpUrlRegex.exec(sftpUrl);
  if(!execArray) throw new Error("Wrong sftp URL");
  if(!execArray.groups) throw new Error("Wrong URL: path is not specified");
  const path = execArray.groups.path;
  const re = /^(?<first>[^\/]+)(?:\/)?(?<second>.*)?/g;
  re.lastIndex = 0;
  const execPathArray = re.exec(path);
  const { groups } = execPathArray ?? {};
  const first = groups?.first;
  const second = groups?.second;
  let dest;
  if(first){
    const execTild = /^(?<tild>~)/.exec(first);
    const { groups } = execTild ?? {};
    dest = groups?.tild ? `${second}` : `/${first}${second ? `/${second}` : ""}`;
  } else {
    dest = path;
  }
  const destination = dest.replace(/\/+$/, "");
  return destination;
}