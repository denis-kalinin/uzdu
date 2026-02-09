import { Argument, Command, Option } from "commander";
import { execute, ShellCallbackParams } from "./ssh";
import { outputConfiguration } from "./utils";

const command = new Command();
command
  .description("Execute commands on remote machine")
  .name("uzdu exec")

command.command("ssh")
  .description("Execute commands via SSH. In addition to sshUrl consider using environment variables UZDU_SSH_KEY_PATH, UZDU_SSH_KEY, UZDU_SSH_PASSWORD")
  .argument("<sshUrl>", "the URL format ssh://[user[:password]@]host[:port]")
  .argument("command", "single line command")
  .addOption(
    new Option("-d|--dotenv [file]", "load environment variables from a property file, i.e. a file with \"key=value\" lines.")
    .preset(".env"))
  .addOption(new Option("--privateKeyPath [path to file]", "Path to SSH private key, fallback is UZDU_SSH_KEY_PATH environment variable. Also consider using UZDU_SSH_KEY to provide SSH private key content or UZDU_SSH_PASSWORD."))
  .action(async (sshUrl: string, command: string, options: any, thisCommand: Command) => {
    try {
      options.callback = (value: ShellCallbackParams) => {
        if(value.message) console.log(value.message);
        if(value.error) console.error(value.error);
      };
      await execute(sshUrl, [command],  options);
    } catch (e) {
      thisCommand.error((e as Error).message || e as string, { exitCode: 127, code: "ssh.upload.error" });
    }
  });

command.configureOutput(outputConfiguration);
command.showHelpAfterError(true);
command.parse();