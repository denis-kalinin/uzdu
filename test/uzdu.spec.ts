import { consola } from "consola";
import { Command } from "commander";
import { getDirMap, getMakeDirs, upload } from "../src/ssh";
import { getEnvironment, initEnvironment, listFiles, resolvePath } from "../src/utils";

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
    let caughtErr: { code: string};
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

describe("Utils", () => {
  it.skip("file map", async () => {
    const plainFiles = [
      "/opt/youroute.app/api-server/web.xml","/opt/youroute.app/api-server/a.js",
    ];
    const from = resolvePath("./test/web");
    const files = await listFiles(from);
    const fileMap = getDirMap(files);
    console.info(JSON.stringify(fileMap));
    const dirs = getMakeDirs(fileMap, "/opt/youroute.app/");
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
  it.skip("add slash", () => {
    const re = /^(?<first>[^\/]+)(?:\/)?(?<second>.*)?/g;
    const path = "~/opt/test/testt/test.tx/";
    re.lastIndex = 0;
    const execArray = re.exec(path);
    const { groups } = execArray ?? {};
    const first = groups?.first;
    const second = groups?.second;
    let dest;
    if(first){
      const execTild = /^(?<tild>~)/.exec(first);
      const { groups } = execTild ?? {};
      dest = groups?.tild ? `./${second}` : `/${first}${second ? `/${second}` : ""}`;
    } else {
      dest = path;
    }
    const destination = dest.replace(/\/+$/, "");
    console.log(destination);    
  });
});

const itIf = (condition: boolean) => (condition ? it : it.skip);
describe("SSH", () => {
  const testSsh = process.env.UZDU_TEST_SSH ? true : false;
  itIf(testSsh)('upload', async () => {
    const sftpUrl = process.env.UZDU_TEST_SSH;
    if(!sftpUrl) throw new Error("Undefined environment variable UZDU_TEST_SSH");
    const from = resolvePath("./test/web/index.html");
    await upload(from, sftpUrl);
  }, 7000);
});
