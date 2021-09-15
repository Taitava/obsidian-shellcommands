import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {getVaultAbsolutePath} from "../../Common";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_VaultPath extends ShellCommandVariable{
    name = "vault_path";
    getValue(): string {
        return getVaultAbsolutePath(this.app);
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{vault_path}}",
    instructions: "Gives the Obsidian vault's absolute path from the root of the filesystem. This is the same that is used as a default working directory if you do not define one manually. If you define a working directory manually, this variable won't give you your manually defined directory, it always gives the vault's root directory.",
});