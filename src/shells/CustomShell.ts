/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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
    Shell,
    SpawnAugmentation,
} from "./Shell";
import {CustomShellInstance} from "../models/custom_shell/CustomShellInstance";
import {Escaper} from "../variables/escapers/Escaper";
import {PlatformId} from "../settings/SC_MainSettings";
import {PowerShellEscaper} from "../variables/escapers/PowerShellEscaper";
import {ShEscaper} from "../variables/escapers/ShEscaper";
import {
    getOperatingSystem,
    isWindows,
    mergeSets,
    normalizePath2,
} from "../Common";
import SC_Plugin from "../main";
import {CustomShellConfiguration} from "../models/custom_shell/CustomShellModel";
import {Variable_ShellCommandContent} from "../variables/Variable_ShellCommandContent";
import {
    parseVariables,
    ParsingResult,
} from "../variables/parseVariables";
import {VariableSet} from "../variables/loadVariables";
import {TShellCommand} from "../TShellCommand";
import {SC_Event} from "../events/SC_Event";
import {debugLog} from "../Debug";

export class CustomShell extends Shell {

    constructor(
        plugin: SC_Plugin,
        private customShellInstance: CustomShellInstance,
    ) {
        super(plugin);
    }

    public getBinaryPath(): string {
        return this.getConfiguration().binary_path;
    }

    protected getEscaper(rawValue: string): Escaper | null {
        const escaper = this.getConfiguration().escaper;
        switch (escaper) {
            case "PowerShell":
                return new PowerShellEscaper(rawValue);
            case "UnixShell":
                return new ShEscaper(rawValue);
            case null:
                // No escaping is wanted for this shell.
                return null;
            default:
                throw new Error("Unrecognised escaper: " + escaper);
        }
    }

    public getIdentifier(): string {
        return this.customShellInstance.getId();
    }

    public getName(): string {
        return this.getConfiguration().name;
    }

    public getSupportedHostPlatforms(): PlatformId[] {
        return [this.getConfiguration().host_platform];
    }

    /**
     * @see CustomShellConfiguration.shell_platform
     * @private Can be made public if needed.
     */
    private getShellPlatformId(): PlatformId {
        return this.getConfiguration().shell_platform ?? getOperatingSystem();
    }

    /**
     * @private Can be made public if needed.
     */
    private shellPlatformIsWindows() {
        return this.getShellPlatformId() === "win32";
    }

    public getPathSeparator(): ":" | ";" {
        return this.shellPlatformIsWindows() ? ";" : ":";
    }

    private getDirectorySeparator(): "\\" | "/" {
        return this.shellPlatformIsWindows() ? "\\" : "/";
    }

    public translateAbsolutePath(originalPath: string): string {
        // 1. Normalize the path before passing it to translator.
        const normalizedPath = normalizePath2(originalPath, this.getDirectorySeparator() === "\\"); // TODO: Think about changing normalizePath2() so that it would take the directory separator as a parameter, rather than a boolean. There's also a possible issue as normalizePath2() does not convert \ to / if needed, it can only convert the other way around, / to \ .

        // 2. Pass to a custom translator (if defined).
        return this.callAbsolutePathTranslator(normalizedPath);
    }

    public translateRelativePath(originalPath: string): string {
        // 1. Normalize the path before passing it to translator.
        const normalizedPath = normalizePath2(originalPath, this.getDirectorySeparator() === "\\"); // TODO: Same as above.

        // 2. Pass to a custom translator (if defined).
        // Actually, custom translator support for relative paths was removed before the custom shell feature was released,
        // as I can't think about any need for it. If needed, the feature can be added later, but it should use a separate
        // user defined function to make it cleaner - no need to have if (type === 'relative') { ... } code in the function.
        return normalizedPath;
    }

    private callAbsolutePathTranslator(path: string): string {
        const pathTranslatorCode: string | null = this.getConfiguration().path_translator;
        if (null === pathTranslatorCode) {
            // No translator is defined.
            // Return the path without modifications.
            return path;
        }

        try {
            // Create a JS function for doing the translation.
            const translatorFunction = new Function(
                "absolutePath", // Parameter names
                pathTranslatorCode // Function content
            );
            const translatedPath = translatorFunction(path);
            if ("string" !== typeof translatedPath) {
                // noinspection ExceptionCaughtLocallyJS . It's ok to catch it locally, it will then be shown in an error balloon.
                throw new Error("Translator function returned " + (String(translatedPath) === "" ? typeof translatedPath : translatedPath) + " instead of a string.");
            }
            return translatedPath;
        } catch (error) {
            // Something failed.
            // Display an error balloon.
            this.plugin.newError(this.getName() + ": Translating path (" + path + ") failed: " + error.message);
            throw error; // Rethrow.
        }
    }

    protected async augmentSpawn(spawnAugmentation: SpawnAugmentation, tShellCommand: TShellCommand | null, scEvent: SC_Event | null): Promise<boolean> {
        const debugLogBase = this.constructor.name + ".augmentSpawn(): ";

        // Disable Node.js's builtin shell feature.
        // CustomShells need to be able to define their own shell invoking command line options, so the Node.js's shell feature would be too limited.
        spawnAugmentation.spawnOptions.shell = false; // It's probably false by default in Node.js's spawn(), but make it explicit.

        // Windows specific settings.
        if (isWindows()) {
            const windowsSpecificSettings = this.getConfiguration().host_platform_configurations.win32;
            if (undefined === windowsSpecificSettings) {
                // Should not be undefined at this point. The settings file should contain a WindowsSpecificShellConfiguration is host_platform is "win32" (which it apparently is, if we got here).
                throw new Error("Windows specific CustomShell configuration is undefined.");
            }
            // If .quote_shell_arguments is false, deny Node.js's child_process.spawn() from:
            // - adding double quotes "" around arguments that contain spaces,
            // - post-fixing existing double quotes with backslashes \
            // Note that .quote_shell_arguments is inverted comparing to windowsVerbatimArguments.
            spawnAugmentation.spawnOptions.windowsVerbatimArguments = !windowsSpecificSettings.quote_shell_arguments;
        }

        // Define shell arguments.
        const shellCommandContentVariable = new Variable_ShellCommandContent(this.plugin, spawnAugmentation.shellCommandContent);
        const rawShellArguments = this.getConfiguration().shell_arguments;
        const parsedShellArguments: string[] = [];
        for (const rawShellArgument of rawShellArguments) {
            debugLog(debugLogBase + "Parsing shell argument: " + rawShellArgument);
            const shellArgumentParsingResult: ParsingResult = await parseVariables(
                this.plugin,
                rawShellArgument,
                this,
                true, // Escape special characters, even though we are in a non-shell context atm. As arguments are parsed by a shell (after it's invoked), they will be used in the shell's context and might need escaping.
                tShellCommand,
                scEvent,
                mergeSets(this.plugin.getVariables(), new VariableSet([shellCommandContentVariable])),
            );
            if (!shellArgumentParsingResult.succeeded) {
                // Shell argument parsing failed.
                debugLog(debugLogBase + "Parsing failed for shell argument: " + rawShellArgument);
                this.plugin.newErrors(shellArgumentParsingResult.error_messages);
                return false; // Deny execution.
            }
            debugLog(debugLogBase + "Shell argument " + rawShellArgument + " was successfully parsed to: " + shellArgumentParsingResult.parsed_content);
            parsedShellArguments.push(shellArgumentParsingResult.parsed_content as string);
        }
        spawnAugmentation.spawnArguments = parsedShellArguments;

        // Tell spawn() to use the shell binary path as an executable command.
        spawnAugmentation.shellCommandContent = this.getBinaryPath(); // Needs to come AFTER the original shellCommandContent is taken to spawnArguments!
        return true; // Allow execution.
    }

    protected _getShellCommandWrapper(): string | null {
        return this.getConfiguration().shell_command_wrapper;
    }

    private getConfiguration(): CustomShellConfiguration {
        return this.customShellInstance.configuration;
    }
}