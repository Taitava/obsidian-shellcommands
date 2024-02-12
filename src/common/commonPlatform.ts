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

import {
    PlatformId,
    PlatformNames,
} from "src/settings/SC_MainSettings";

/**
 * For some reason there is no Platform.isWindows .
 */
export function isWindows() {
    return process.platform === "win32";
}

/**
 * This is just a wrapper around platform() in order to cast the type to PlatformId.
 * TODO: Consider renaming this to getCurrentPlatformId().
 */
export function getOperatingSystem(): PlatformId  {
    // @ts-ignore In theory, platform() can return an OS name not included in OperatingSystemName. But as Obsidian
    // currently does not support anything else than Windows, Mac and Linux (except mobile platforms, but they are
    // ruled out by the manifest of this plugin), it should be safe to assume that the current OS is one of those
    // three.
    return platform();
}

export function getCurrentPlatformName(): string {
    return getPlatformName(getOperatingSystem());
}

export function getPlatformName(platformId: PlatformId) {
    const platformName: string | undefined = PlatformNames[platformId];
    if (undefined === platformName) {
        throw new Error("Cannot find a platform name for: " + platformId);
    }
    return platformName;
}

type ObsidianInstallationType = "Flatpak" | "AppImage" | "Snap" | null;

/**
 * Tries to determine how Obsidian was installed. Used for displaying a warning if the installation type is "Flatpak".
 *
 * The logic is copied on 2023-12-20 from https://stackoverflow.com/a/75284996/2754026 .
 *
 * @return "Flatpak" | "AppImage" | "Snap" or `null`, if Obsidian was not installed using any of those methods, i.e. the installation method is unidentified.
 */
export function getObsidianInstallationType(): ObsidianInstallationType {
    if (process.env["container"]) {
        return "Flatpak";
    } else if (process.env["APPIMAGE"]) {
        return "AppImage";
    } else if (process.env["SNAP"]) {
        return "Snap";
    }
    return null;
}