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
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannelCode";


export class OutputChannelDriver_Notification extends OutputChannelDriver {

    public static getTitle(output_stream: OutputStream): string {
        switch (output_stream) {
            case "stdout":
                return "Notification balloon";
            case "stderr":
                return "Error balloon";
        }
    }

    protected _handleBuffered(output: OutputStreams, error_code: number | null): void {

        // Iterate output streams.
        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, two
        // notifications will be created.
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {
            const output_message = output[output_stream_name];
            switch (output_stream_name) {
                case "stdout":
                    // Normal output
                    this.plugin.newNotification(output_message);
                    break;
                case "stderr":
                    // Error output
                    this.plugin.newError("[" + error_code + "]: " + output_message);
                    break;
            }
        }
    }
}