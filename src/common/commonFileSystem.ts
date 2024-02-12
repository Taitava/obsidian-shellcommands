/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import * as fs from "fs";
import SC_Plugin from "../main";
import {
    App,
    FileSystemAdapter,
} from "obsidian";
import * as path from "path";
import { normalizePath2 } from "./commonObsidian";
import { isWindows } from "src/common/commonPlatform";

export function getVaultAbsolutePath(app: App) {
    // Original code was copied 2021-08-22 from https://github.com/phibr0/obsidian-open-with/blob/84f0e25ba8e8355ff83b22f4050adde4cc6763ea/main.ts#L66-L67
    // But the code has been rewritten 2021-08-27 as per https://github.com/obsidianmd/obsidian-releases/pull/433#issuecomment-906087095
    const adapter = app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }
    throw new Error("Could not retrieve vault path. No DataAdapter was found from app.vault.adapter.");
}

export function getPluginAbsolutePath(plugin: SC_Plugin, convertSlashToBackslash: boolean) {
    return normalizePath2(
        path.join(
            getVaultAbsolutePath(plugin.app),
            plugin.app.vault.configDir,
            "plugins",
            plugin.getPluginId()
        ),
        convertSlashToBackslash
    );
}

export function extractFileName(file_path: string, with_extension = true) {
    if (with_extension) {
        return path.parse(file_path).base;
    } else {
        return path.parse(file_path).name;
    }
}

export function extractFileParentPath(file_path: string) {
    return path.parse(file_path).dir;
}

/**
 * On Windows: Checks if the given filePath exists WHEN ADDING any extension from the PATHEXT environment variable to the
 * end of the file path. This can notice that e.g. "CMD" exists as a file name, when it's checked as "CMD.EXE".
 * On other platforms than Windows: Returns always false.
 * Note: This DOES NOT CHECK existence of the original filePath without any additions. The caller should check it themselves.
 */
export function lookUpFileWithBinaryExtensionsOnWindows(filePath: string): boolean {
    if (isWindows()) {
        // Windows: Binary path may be missing a file extension, but it's still a valid and working path, so check
        // the path with additional extensions, too.
        const pathExt = process.env.PATHEXT ?? "";
        for (const extension of pathExt.split(";")) {
            if (fs.existsSync(filePath + extension)) {
                return true;
            }
        }
    }
    return false;
}