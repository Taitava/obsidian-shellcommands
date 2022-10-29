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
import {EOL} from "os";

export class OutputChannelDriver_StatusBar extends OutputChannelDriver {
    protected readonly title = "Status bar";
    protected accepts_empty_output = true;

    public hotkey_letter = "S";

    /**
     * Combine stdout and stderr (in case both of them happen to be present).
     * @protected
     */
    protected combine_output_streams = EOL + EOL;

    public _handle(output_message: string) {
        const status_bar_element = this.plugin.getOutputStatusBarElement();

        output_message = output_message.trim();

        // Full output (shown when hovering with mouse)
        status_bar_element.setAttr("aria-label", output_message);

        // Show last line permanently.
        const output_message_lines = output_message.split(/(\r\n|\r|\n)/u);
        const last_output_line = output_message_lines[output_message_lines.length - 1];
        status_bar_element.setText(last_output_line);
    }
}