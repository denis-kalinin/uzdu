import { consola } from "consola";
import { Command } from "commander";
import { getDirMap, getMakeDirs, upload } from "../src/ssh";
import { getEnvironment, initEnvironment, listFiles, resolvePath } from "../src/utils";


const theEnv = getEnvironment();
initEnvironment(theEnv);

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

describe.skip("Utils", () => {
  it("file map", async () => {
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
});

describe("SSH", () => {
  it("upload", async () => {
    const sftpUrl = process.env.UZDU_TEST_SSH;
    if(!sftpUrl) throw new Error("Undefined environment variable UZDU_TEST_SSH");
    const from = resolvePath("./test/web");
    await upload(from, sftpUrl);
  }, 7000);
});
