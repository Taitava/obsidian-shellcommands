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
    OutputHandlerCode,
    OutputHandlerConfigurations,
    OutputChannelOrder,
    OutputHandlingMode,
} from "../output_channels/OutputHandlerCode";
import {
    ICommandPaletteOptions,
    IPlatformSpecificString,
    IPlatformSpecificStringWithDefault,
} from "./SC_MainSettings";
import {SC_EventConfigurations} from "../events/SC_EventConfiguration";
import {InheritableVariableDefaultValueConfiguration} from "../variables/Variable";
import {
    PreactionConfiguration,
} from "../imports";
import {OutputChannel} from "../output_channels/OutputChannel";

export interface ShellCommandConfiguration {
    id: string,
    /**
     * Contains operating system specific shell commands.
     *  - key: platform (= OS) name
     *  - value: shell command
     */
    platform_specific_commands: IPlatformSpecificStringWithDefault;
    shells: IPlatformSpecificString;
    alias: string;
    icon: string | null;
    confirm_execution: boolean;
    ignore_error_codes: number[];
    input_contents: {
        stdin: string | null,
    },
    output_handlers: OutputHandlerConfigurations,

    output_wrappers: {
        stdout: string | null,
        stderr: string | null,
    };
    output_channel_order: OutputChannelOrder;
    output_handling_mode: OutputHandlingMode;
    events: SC_EventConfigurations;
    throttle: number | null;
    command_palette_availability: keyof ICommandPaletteOptions;
    preactions: PreactionConfiguration[];
    variable_default_values: {
        [variable_id_or_name: string]: InheritableVariableDefaultValueConfiguration,
    };

    // LEGACY
    /** @deprecated Migrated to output_handlers. */
    output_channels?: {stdout: OutputHandlerCode, stderr: OutputHandlerCode},
    /** @deprecated Can only be used for migration. */
    shell_command?: string;
}

export function newShellCommandConfiguration(shell_command_id: string, shell_command = ""): ShellCommandConfiguration {
    return {
        id: shell_command_id,
        platform_specific_commands: {
            default: shell_command,
        },
        shells: {},
        alias: "",
        icon: null,
        confirm_execution: false,
        ignore_error_codes: [],
        input_contents: {
            stdin: null,
        },
        output_handlers: {
            stdout: OutputChannel.getDefaultConfiguration("ignore"),
            stderr: OutputChannel.getDefaultConfiguration("notification"),
        },
        output_wrappers: {
            stdout: null,
            stderr: null,
        },
        output_channel_order: "stdout-first",
        output_handling_mode: "buffered",
        events: {},
        throttle: null,
        command_palette_availability: "enabled",
        preactions: [],
        variable_default_values: {},
    };
}