/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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

/**
 * Designed additional values for later: "specific-file-top" | "specific-file-bottom" | "specific-file-caret" (if possible)
 * See discussion: https://github.com/Taitava/obsidian-shellcommands/discussions/16
 */
export type OutputChannel = "ignore" | "notification" | "current-file-caret" | "current-file-top" | "current-file-bottom" | "status-bar" | "clipboard" | "modal" | "open-files";

export interface OutputChannels {
    stdout: OutputChannel,
    stderr: OutputChannel,
};

export type OutputChannelOrder = "stdout-first" | "stderr-first";

export type OutputStream = "stdout" | "stderr";

export type OutputHandlingMode = "buffered" | "realtime";