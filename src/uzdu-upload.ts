import { Argument, Command, Option } from "commander";
import { getEnvironment, initEnvironment, outputConfiguration, resolvePath, safeIndex, shouldBeDirectory } from "./utils";
import azUpload, { AzureStorageOptions } from "./azure";
import s3Upload, { S3Config } from "./s3";
import { upload as httpUpload}  from "./http";
import { getCredentials, upload as sshUpload } from "./ssh";
import { ConnectConfig } from "ssh2";
import fs from "fs";


const command = new Command();
command
  .description("Upload to Azure, AWS and HTTP server")
  .name("uzdu upload")

command.command("aws")
  .description("upload to AWS S3")
  .argument("<from>", "the directory to upload to the <bucket>")
  .argument("<bucket>", "the AWS S3 bucket[:region[:endpoint]], e.g. \"mybucket\", \"mybucket:us-east-2\" or \"mybucket:my-region:https://my-s3-provider/endpoint\". [:region] overrides S3_REGION environment variable. Expects environment variables S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.")
  .addOption(
    new Option("-d|--dotenv [file]", "load environment variables from a properties file, i.e. a file with \"key=value\" lines.")
    .preset(".env"))
  .action(async (from: string, bucket: string, options: any, thisCommand: Command) => {
    try{
      if(options.dotenv){
        const theEnv = getEnvironment(options.dotenv);
        initEnvironment(theEnv);
      }
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
      await s3Upload(from, config);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 53, code: "aws.upload.error" });
    }
  })

command.command("http")
  .description("upload to HTTP server with PUT method")
  .argument("<from>", "upload this file to a <url>")
  .argument("<url>", "URL for a PUT operation")
  .addOption(
    new Option("--header <http-header>", "HTTP Header, e.g.: --header \"Authentication: cGFzc3dvcmQ=\"")
    .argParser<string[]>((val, acc) => acc?.concat([val]))
    .default([])
  )
  .addOption(
    new Option("-d|--dotenv [file]", "load environment variables from a properties file, i.e. a file with \"key=value\" lines.")
    .preset(".env"))
  .action(async (from: string, url: string, options: any, thisCommand: Command) => {
    if(options.dotenv){
      const theEnv = getEnvironment(options.dotenv);
      initEnvironment(theEnv);
    }
    try {
      const urlAddr = new URL(url);
      await httpUpload(from, urlAddr, options.header);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 4117, code: "http.upload.error" });
    }
  });

command.command("azure")
  .alias("az")
  .description("upload to Azure Blob Storage")
  .argument("<from>", "upload this directory or file to a [container]")
  .addArgument(new Argument("[container]", "container name").default("$web", "$web"))
  .addOption(
    new Option("-d|--dotenv [file]", "load environment variables from a property file, i.e. a file with \"key=value\" lines.")
    .preset(".env"))
  .action(async (from: string, container: string, options: any, thisCommand: Command) => {
    try {
      if(options.dotenv){
        const theEnv = getEnvironment(options.dotenv);
        initEnvironment(theEnv);
      }
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is absent in environment variables. Consider option --dotenv to laod it.");
      }
      shouldBeDirectory(from);
      const azOpt: AzureStorageOptions = {
        connectionString,
        container,
      };
      await azUpload(from, azOpt);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 43, code: "az.upload.error" });
    }
  });

command.command("ssh")
  .description("upload via SFTP. In addition to sftpURL consider using environment variables UZDU_SSH_KEY_PATH, UZDU_SSH_KEY, UZDU_SSH_PASSWORD")
  .argument("<source>", "source directory or file to upload into <ssh_server>")
  .argument("<sftpUrl>", "the URL format: sftp://[user[:password]@]host[:port]/path/to/file")
  .addOption(
    new Option("-d|--dotenv [file]", "load environment variables from a property file, i.e. a file with \"key=value\" lines.")
    .preset(".env"))
  .addOption(new Option("--privateKeyPath [path to file]", "Path to SSH private key, fallback is UZDU_SSH_KEY_PATH environment variable. Also consider using UZDU_SSH_KEY to provide SSH private key content or UZDU_SSH_PASSWORD."))
  .action(async (source: string, sftpUrl: string, options: any, thisCommand: Command) => {
    try {
      await sshUpload(resolvePath(source), sftpUrl, options);
    } catch (e) {
      //console.error(e);
      thisCommand.error((e as Error).message || e as string, { exitCode: 127, code: "ssh.upload.error" });
    }
  });

command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();


