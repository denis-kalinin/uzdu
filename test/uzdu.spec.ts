import { consola } from "consola";
import { Command } from "commander";
import * as ssh from "../src/ssh";
import s3upload, { S3Config } from "../src/s3";
import { getEnvironment, initEnvironment, listFiles, resolvePath, shouldBeDirectory } from "../src/utils";
import { allowedNodeEnvironmentFlags } from "process";

try {
  const theEnv = getEnvironment();
  initEnvironment(theEnv);
} catch {}

describe.skip("Direct", () => {
  it("... wihtout attachments", () => {
    const program = new Command();
    program
      .exitOverride()
      .command("order-cake")
      .action(() => {});
    let caughtErr: { code: string };
    try {
      program.parse(["node", "uzdu", "order-cake", "--color"]);
    } catch (err) {
      caughtErr = err as { code: string };
      expect(caughtErr.code).toEqual("commander.unknownOption");
    }
  });
});

describe.skip("CLI", () => {
  it("--help", () => {
    const program = new Command();
    program
      .exitOverride()
      .command("order-cake")
      .action(() => {});
    let caughtErr: { code: string };
    try {
      program.parse(["node", "uzdu", "order-cake", "--color"]);
    } catch (err) {
      caughtErr = err as { code: string };
      expect(caughtErr.code).toEqual("commander.unknownOption");
    }
  });
});

describe("Utils", () => {
  it.skip("file map", async () => {
    const plainFiles = [
      "/opt/youroute.app/api-server/web.xml","/opt/youroute.app/api-server/a.js",
    ];
    const from = resolvePath("./test/web");
    const files = await listFiles(from);
    const fileMap = ssh.getDirMap(files);
    console.info(JSON.stringify(fileMap));
    const dirs = ssh.getMakeDirs(fileMap, "/opt/youroute.app/");
    if(dirs) dirs.map((dir) => consola.log(dir));
  });
  it.skip("alter destination", () => {
    const re = /^(?<first>[^~\/]+)(?:\/)?(?<second>.*)?/g
    const path1 = "";
    re.lastIndex = 0;
    const execArray = re.exec(path1);
    const { groups } = execArray ?? {};
    const first = groups?.first ? `/${groups?.first}` : path1;
    const dest1 = `${first}${ groups?.second ? `/${groups.second}` : ""}`;
    const dest = dest1.replace(/\/+$/, "");
    console.log(dest);
  });
  it("Parsing URL sftp://admin@localhost/tmp/test/", () => {
    const config = ssh.getConnectConfig("sftp://admin@localhost/tmp/test/");
    expect(config.username).toBeDefined();
    expect(config.host).toBeDefined();
    expect(config.path).toBeDefined()
  });
  it("Parsing URL admin@localhost", () => {
    const config = ssh.getConnectConfig("admin@localhost");
    expect(config.username).toBeDefined();
    expect(config.host).toBeDefined();
  });
  const r = /^([^\r]*)$|^([^\r]*)\r\n|(?<=\r)([^\r]*)\r\n/g;
  it("Parsing output", () => {
    //const text = 'Hello world!\r\nReading package lists... 49%\r\rReading package lists... 50%\r\n\rReading package lists... 51%\r\n\rgas\r';
    const text = 'Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\r\n' +
        '\r0% [Waiting for headers]\r                        \rHit:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease\r\n' +
        '\r                        \rHit:3 http://security.ubuntu.com/ubuntu noble-security InRelease\r\n' +
        '\r0% [Waiting for headers]';
    const gm = text.match(r);
    expect(gm).not.toBeNull();
    expect(gm?.length).toEqual(3);
  })
  it("Parsing \"Hello world!\\r\\n\" output", () => {
    const text = 'Hello world!\r\n';
    const gm = text.match(r);
    expect(gm).not.toBeNull();
    expect(gm?.length).toEqual(1);
  })
  it("Parsing \"Hello world!\" output", () => {
    const text = 'Hello world!';
    const gm = text.match(r);
    expect(gm).not.toBeNull();
    expect(gm?.length).toEqual(1);
  })
});

const itIf = (condition: boolean) => (condition ? it : it.skip);
describe("SSH", () => {
  const sftpUrl = process.env.UZDU_TEST_SSH;
  const testSsh = sftpUrl ? true : false;
  itIf(testSsh)('upload', async () => {
    const from = resolvePath("./test/web/");
    await ssh.upload(from, sftpUrl!);
  }, 7000);
  itIf(testSsh)('exec', async () => {
    await ssh.execute(sftpUrl!, ['echo Hello Mundo!'], {
      callback: (val) => {
        if(val.message){
          expect(val.message).toEqual("Hello Mundo!\r\n");
          console.debug('cat test.txt =>', val.message);
        }
      }
    });
  }, 15000);
});
describe.skip("S3", () => {
  const testS3 = process.env.UZDU_TEST_S3 ? true : false;
  itIf(testS3)('upload', async () => {
    const bucket = process.env.UZDU_TEST_S3;
    if(!bucket) throw new Error("Undefined environment variable UZDU_TEST_S3");
    const from = resolvePath("./test/web");
    shouldBeDirectory(from);
    const env: Partial<S3Config> = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    };
    const [bucketName, region, ...rest] = bucket.split(":")
    const endpoint = (rest.length > 0) ? rest.join(":").trim() : undefined;
    const optConfig: Partial<S3Config> = { bucket: bucketName, endpoint, };
    if(region) optConfig.region = region;
    const config = Object.assign(env, optConfig) as S3Config;
    if(!config.accessKeyId) throw new Error("AWS Access Key ID is not specified. Provide an environement variable S3_ACCESS_KEY_ID.");
    if(!config.secretAccessKey) throw new Error("AWS Secret Key is not specified. Provide an environment variable S3_SECRET_ACCESS_KEY.");
    if(!config.region) throw new Error("AWS region is not specified. Provide it in a bucket address or as an envronment variable S3_REGION.");
    await s3upload(from, config);
  }, 7000);
});
