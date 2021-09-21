export interface ShellCommandsConfiguration {
    [key: string]: ShellCommandConfiguration;
}

export interface ShellCommandConfiguration {
    shell_command: string;
    alias: string;
    confirm_execution: boolean;
}

export function newShellCommandConfiguration(shell_command: string = ""): ShellCommandConfiguration {
    return {
        shell_command: shell_command,
        alias: "",
        confirm_execution: false,
    }
}