import { defineConfig } from "tsup";
import path from "path";
import fs from "fs";
import packageJson from "./package.json" with { type: "json" }

const parseProperties = (text: string) => {
  const lines = text.split('\n');
  let properties: Record<string, string> = {};
  lines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      const value = values.join("=");
      properties[key.trim()] = value.trim();
    }
  });
  return properties;
}


//const _fullPacakgeJsonPath = process.env.npm_package_json!;
//const _packageJsonRelativePath = path.relative(__dirname,  _fullPacakgeJsonPath);
//const packageJsonPath = "./" + _packageJsonRelativePath.split(path.sep).join(path.posix.sep);
/*
let buildEnv: Record<string, string | undefined> = { GITHUB_RUN_NUMBER: process.env.GITHUB_RUN_NUMBER};
try {
  if(import.meta.env.propertiesFile){
    const data = fs.readFileSync(env.propertiesFile, { encoding: "utf-8"});
    const props = parseProperties(data);
    for (const key in props) {
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        buildEnv[key] = props[key];
      }
    }
  }
} catch(e){}
console.log(buildEnv);
*/

interface ImportMetaEnv {
    nextVersion?: string;
    GITHUB_RUN_NUMBER?: string | number;
}
declare global {
    interface ImportMeta {
        env?: ImportMetaEnv;
    }
}
type ProcessArguments = {
  "env.nextVersion"?: string
}
function isKeyOf<T extends object>(key: string | number | symbol, obj: T): key is keyof T {
  return key in obj;
}
const getVersion = () => {
  console.log("process arguments");
  const args = getArgs(process.argv.slice(2)) as ProcessArguments;
  console.dir(args);
  console.log("----");
  return args["env.nextVersion"] ? JSON.stringify(args["env.nextVersion"]) : (process.env.GITHUB_RUN_NUMBER ? JSON.stringify(`${packageJson.version}-build_${process.env.GITHUB_RUN_NUMBER}`) : JSON.stringify(packageJson.version));
}

const getArgs = (processArguments: string[]) => {
  const argsObject =  processArguments.reduce<{[key:string]: string | true}>((args, arg) => {
    if (arg.slice(0, 2) === "--") {
      const longArg = arg.split("=");
      const longArgFlag = longArg[0].slice(2);
      const longArgValue = longArg.length > 1 ? longArg[1] : true;
      args[longArgFlag] = longArgValue;
    } else if (arg[0] === "-") {
      const flags = arg.slice(1).split("");
      flags.forEach((flag) => {
        args[flag] = true;
      });
    }
    return args;
  }, {});
  return argsObject;
}

export default defineConfig({
  entry: [
    "src/uzdu.ts",
    "src/uzdu-upload.ts",
    "src/uzdu-download.ts",
    "src/uzdu-metadata.ts",
    "src/uzdu-zip.ts",
    "src/uzdu-unzip.ts",
    "src/uzdu-copy.ts",
  ],
  clean: true,
  //format: ["cjs"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  minify: false,
  define: {
    //NPM_PACKAGE_VERSION: process.env.GITHUB_RUN_NUMBER ? JSON.stringify(`${packageJson.version}-build_${process.env.GITHUB_RUN_NUMBER}`) : JSON.stringify(packageJson.version),
    NPM_PACKAGE_VERSION: getVersion(),
    NPM_PACKAGE_DESCRIPTION: JSON.stringify(packageJson.description),
  }
});