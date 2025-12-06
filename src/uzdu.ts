#! /usr/bin/env node

import { Command } from "commander";
import { outputConfiguration } from "./utils";


declare const NPM_PACKAGE_VERSION: string;
declare const NPM_PACKAGE_DESCRIPTION: string;
let version, description;
try {
  version = NPM_PACKAGE_VERSION;
  description = NPM_PACKAGE_DESCRIPTION;
} catch (e) {
  if(e instanceof ReferenceError) {
    version = "0.0.0-dev";
    description = "Universal zipper, downloader and uploader"
  }
  else throw e;
}

const program = new Command();

program
  .name("uzdu")
  .version(version)
  .description(description)

program.command("upload", "upload a file or directory")
  .alias("up");

program.command("download", "download from URL")
  .alias("down");

program.command("zip", "create zip-archive from a directory or a file");
program.command("unzip", "unzip archive to a directory");
program.command("copy", "copy files and directories");
program.command("metadata", "create Amazon S3 metadata file. See https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html.")
  .alias("meta")
  
program.configureOutput(outputConfiguration);

async function main(){
  await program.parseAsync();
}
main()
  .catch((e) => {
    console.error("Catch it!", e);
    process.exit(20);
  });

export { program };

