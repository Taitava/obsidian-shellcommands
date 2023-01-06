/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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

import {OutputChannel} from "./OutputChannel";
import {EOL} from "os";

export class OutputChannel_StatusBar extends OutputChannel {
    protected static readonly title = "Status bar";
    protected static readonly accepts_empty_output = true;

    public static readonly hotkey_letter = "S";

    /**
     * All received output cumulatively. Subsequent handlings will then use the whole output, not just new parts.
     * Only used in "realtime" mode.
     *
     * @private
     */
    private realtimeContentBuffer = "";

    /**
     * Combine stdout and stderr (in case both of them happen to be present).
     * @protected
     */
    protected static readonly combine_output_streams = EOL + EOL;

    public async _handleBuffered(outputContent: string): Promise<void> {
        this.setStatusBarContent(outputContent);
    }

    public async _handleRealtime(outputContent: string): Promise<void> {
        this.realtimeContentBuffer += outputContent;
        this.setStatusBarContent(this.realtimeContentBuffer);
    }

    private setStatusBarContent(outputContent: string) {
        const status_bar_element = this.plugin.getOutputStatusBarElement();

        outputContent = outputContent.trim();

        // Full output (shown when hovering with mouse)
        status_bar_element.setAttr("aria-label", outputContent);

        // Show last line permanently.
        const output_message_lines = outputContent.split(/(\r\n|\r|\n)/u);
        const last_output_line = output_message_lines[output_message_lines.length - 1];
        status_bar_element.setText(last_output_line);
    }
}