import {isWindows} from "./Common";

export function getUsersDefaultShell(): string {
    if (isWindows()) {
        return process.env.ComSpec;
    } else {
        return process.env.SHELL;
    }
}