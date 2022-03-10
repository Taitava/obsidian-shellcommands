import {getVaultAbsolutePath} from "../Common";
import {Variable} from "./Variable";

export class Variable_VaultPath extends Variable{
    public variable_name = "vault_path";
    public help_text = "Gives the Obsidian vault's absolute path from the root of the filesystem. This is the same that is used as a default working directory if you do not define one manually. If you define a working directory manually, this variable won't give you your manually defined directory, it always gives the vault's root directory.";

    protected generateValue(): string {
        return getVaultAbsolutePath(this.app);
    }
}