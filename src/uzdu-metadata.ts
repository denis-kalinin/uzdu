import { Argument, Command } from "commander";
import { addMetadata, makeZip, outputConfiguration, shouldBeDirectory } from "./utils";

const command = new Command();

command
  .name("uzdu meta")
  .argument("<dir>", "a directory")
  .addArgument(new Argument("[metadata-file]", "a JSON-file with a directory metadata for Amazon S3, adds the metadata file to the same directory. See https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html")
    .default(".metadata.json"))
  .action(async (dir: string, metadataFile: string) => {
    try {
      shouldBeDirectory(dir);
      await addMetadata(dir, metadataFile);
    } catch (e) {
      command.error((e as Error).message || e as string, { exitCode: 111, code: "metadata.error" });
    }
  });
command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();