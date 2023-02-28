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
    normalizePath2,
} from "../Common";
import SC_Plugin from "../main";
import * as fs from "fs";
import {CustomShellConfiguration} from "../models/custom_shell/CustomShellModel";
import {Variable_ShellCommandContent} from "../variables/Variable_ShellCommandContent";
import {
    parseVariableSynchronously,
    ParsingResult,
} from "../variables/parseVariables";
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
        const shellBinaryPath = this.getBinaryPath();
        if (!fs.existsSync(shellBinaryPath)) {
            // Shell binary does not exist.
            this.plugin.newError("Custom shell " + this.getName() + ": Binary path does not exist: " + shellBinaryPath);
            return false; // Prevent execution.
        }

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
            const shellArgumentParsingResult: ParsingResult = await parseVariableSynchronously(
                rawShellArgument,
                shellCommandContentVariable,
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
        spawnAugmentation.shellCommandContent = shellBinaryPath; // Needs to come AFTER the original shellCommandContent is taken to spawnArguments!
        return true; // Allow execution.
    }

    /**
     * Apply a possible wrapper on an executable shell command content.
     *
     * This method is called before .augmentSpawn() is called, i.e. the result of this method is available in SpawnAugmentation.shellCommandContent when .augmentSpawn() is called.
     *
     * @param shellCommandContent
     * @param tShellCommand
     * @param scEvent
     */
    public augmentShellCommandContent(shellCommandContent: string, tShellCommand: TShellCommand | null, scEvent: SC_Event | null): string {
        const shellCommandContentWrapper = this.getConfiguration().shell_command_wrapper;
        if (null === shellCommandContentWrapper) {
            // No wrapper is defined, so return the shell command content without modifications.
            return shellCommandContent;
        }

        // Wrap the shell command.
        const wrapperParsingResult = parseVariableSynchronously(
            shellCommandContentWrapper,
            new Variable_ShellCommandContent(this.plugin, shellCommandContent),
        );
        if (!wrapperParsingResult.succeeded) {
            // {{shell_command_content}} is so simple that there should be no way for its parsing to fail.
            throw new Error("{{shell_command_content}} parsing failed, although it should not fail.");
        }

        // TODO: Consider reading wrapperParsingResult.count_parsed_variables. If it's 0, {{shell_command_content}} was not present in the wrapper, and an error should be shown. But need to design it in a way that the error is only shown if a command is really being executed - otherwise the error should be suppressed. E.g. 'Copy Shell command URI' button in settings calls TShellCommand.getShellCommandContentForExecution() because it needs to read possible custom variables used in the shell's wrapper, too, but errors should be suppressed in that context.

        return wrapperParsingResult.parsed_content as string; // It's always string at this point, as .succeeded is checked above.
    }

    private getConfiguration(): CustomShellConfiguration {
        return this.customShellInstance.configuration;
    }
}