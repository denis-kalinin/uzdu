import { consola } from "consola";
import { Command } from "commander";
import * as ssh from "../src/ssh";
import s3upload, { S3Config } from "../src/s3";
import { getEnvironment, initEnvironment, listFiles, resolvePath, shouldBeDirectory } from "../src/utils";

try {
  const theEnv = getEnvironment();
  console.log(theEnv);
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
    let caughtErr: { code: string};
    try {
      program.parse(["node", "uzdu", "order-cake", "--color"]);
    } catch (err) {
      caughtErr = err as { code: string };
      expect(caughtErr.code).toEqual("commander.unknownOption");
    }
  });
});

describe.skip("Utils", () => {
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
});

const itIf = (condition: boolean) => (condition ? it : it.skip);
describe("SSH", () => {
  const testSsh = false;// process.env.UZDU_TEST_SSH ? true : false;
  itIf(testSsh)('upload', async () => {
    const sftpUrl = process.env.UZDU_TEST_SSH;
    if(!sftpUrl) throw new Error("Undefined environment variable UZDU_TEST_SSH");
    const from = resolvePath("./test/web/index.html");
    try{
      await ssh.upload(from, sftpUrl);
    } catch (e) {
      console.error("TEST ERROR", e);
    }
  }, 7000);
  itIf(true)('exec', async () => {
    const sftpUrl = process.env.UZDU_TEST_SSH;
    if(!sftpUrl) throw new Error("Undefined environment variable UZDU_TEST_SSH");
    await ssh.execute(sftpUrl, ['echo Hello'], {
      callback: (val) => { console.log("SSH execute output", val.message)}
    });
  }, 7000);
  it.skip('upload to envoy', async () => {
    const sftpUrl = "sftp://root:itranga123@185.104.251.233/opt/docker/minecraft";
    if(!sftpUrl) throw new Error("Undefined environment variable UZDU_TEST_SSH");
    const from = resolvePath("./test/web/index.html");
    await ssh.upload(from, sftpUrl);
  }, 7000);
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
