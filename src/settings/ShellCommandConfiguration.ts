export interface ShellCommandsConfiguration {
    [key: string]: ShellCommandConfiguration;
}

export interface ShellCommandConfiguration {
    shell_command: string;
    alias: string;
    confirm_execution: boolean;
    ignore_error_codes: number[];
}

export function newShellCommandConfiguration(shell_command: string = ""): ShellCommandConfiguration {
    return {
        shell_command: shell_command,
        alias: "",
        confirm_execution: false,
        ignore_error_codes: [],
    }
}