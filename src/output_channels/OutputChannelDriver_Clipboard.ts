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

import {OutputChannelDriver} from "./OutputChannelDriver";
import {copyToClipboard} from "../Common";
import {EOL} from "os";

export class OutputChannelDriver_Clipboard extends OutputChannelDriver {
    protected static readonly title = "Clipboard";

    public static readonly hotkey_letter = "L";

    /**
     * There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, they
     * will be joined together with " " as a separator.
     * @protected
     */
    protected static readonly combine_output_streams = " ";

    protected _handle(output_message: string) {
        copyToClipboard(output_message);

        if (this.plugin.settings.output_channel_clipboard_also_outputs_to_notification) {
            // Notify the user so they know a) what was copied to clipboard, and b) that their command has finished execution.
            this.plugin.newNotification("Copied to clipboard: " + EOL + output_message + EOL + EOL + "(Notification can be turned off in settings.)");
        }
    }
}