import {App} from "obsidian";

export function getVaultAbsolutePath(app: App) {
    // The below two lines were copied 2021-08-22 from https://github.com/phibr0/obsidian-open-with/blob/84f0e25ba8e8355ff83b22f4050adde4cc6763ea/main.ts#L66-L67
    // @ts-ignore
    return app.vault.adapter.basePath;
}

export function isWindows() {
    return process.platform === "win32";
}