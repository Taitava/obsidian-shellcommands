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

import {OutputChannel} from "./OutputChannel";
import {OutputStreams} from "./OutputChannelFunctions";
import {OutputStream} from "./OutputChannelCode";
import {Notice} from "obsidian";


export class OutputChannel_Notification extends OutputChannel {

    /**
     * All received output cumulatively. Subsequent handlings will then use the whole output, not just new parts.
     * Only used in "realtime" mode.
     *
     * Grouped by output stream so that stdout and stderr won't mix up.
     *
     * @private
     */
    private realtimeContentBuffers: {
        stdout: string,
        stderr: string,
    } = {
        stdout: "",
        stderr: "",
    };

    /**
     * Holds a Notice instances so that the message can be updated during subsequent handlings.
     * Only used in "realtime" mode.
     *
     * @private
     */
    private realtimeNotices: {
        stdout?: Notice,
        stderr?: Notice,
    } = {};

    private realtimeNoticeTimeouts: {
        stdout?: number,
        stderr?: number,
    } = {};

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
            this.notify(output_stream_name, output_message, error_code);
        }
    }

    protected _handleRealtime(outputContent: string, outputStreamName: OutputStream): void {

        // Append new content
        this.realtimeContentBuffers[outputStreamName] += outputContent;

        // Does a Notice exist already?
        if (this.realtimeNotices[outputStreamName]) {
            // Reuse an existing Notice.

            // Should output be formatted?
            let updatedMessage: string;
            switch (outputStreamName) {
                case "stdout":
                    // Use output as-is
                    updatedMessage = this.realtimeContentBuffers[outputStreamName];
                    break;
                case "stderr":
                    // Apply error formatting to output
                    updatedMessage = OutputChannel_Notification.formatErrorMessage(this.realtimeContentBuffers[outputStreamName], null);
                    break;
            }

            // Use the updated output
            this.realtimeNotices[outputStreamName].setMessage(updatedMessage);

            // Update notice hiding timeout
            window.clearTimeout(this.realtimeNoticeTimeouts[outputStreamName]); // Remove old timeout
            this.handleNotificationHiding(outputStreamName); // Add new timeout
        } else {
            // Create a new Notice.
            this.realtimeNotices[outputStreamName] = this.notify(
                outputStreamName,
                this.realtimeContentBuffers[outputStreamName],
                null,
                0, // Use 0 timeout so that the Notice won't hide automatically.
            );

            // Create a timeout for hiding the Notice
            this.handleNotificationHiding(outputStreamName);
        }
    }

    protected _endRealtime(exitCode: number): void {
        // If an stderr Notice exists, update it with the exitCode
        this.realtimeNotices["stderr"]?.setMessage(OutputChannel_Notification.formatErrorMessage(
            this.realtimeContentBuffers["stderr"],
            exitCode,
        ));
    }

    /**
     *
     * @param outputStreamName
     * @param outputContent
     * @param exitCode
     * @param noticeTimeout Allows overriding the notice/error timeout setting.
     * @private
     */
    private notify(outputStreamName: OutputStream, outputContent: string, exitCode: number | null, noticeTimeout?: number): Notice {
        switch (outputStreamName) {
            case "stdout":
                // Normal output
                return this.plugin.newNotification(outputContent, noticeTimeout ?? undefined);
            case "stderr":
                // Error output
                return this.plugin.newError(OutputChannel_Notification.formatErrorMessage(outputContent, exitCode), noticeTimeout ?? undefined);
        }
    }

    private static formatErrorMessage(outputContent: string, exitCode: number | null): string {
        if (null === exitCode) {
            // If a "realtime" process is not finished, there is no exit code yet.
            // @ts-ignore Yea I know "..." is not a number nor null. :)
            exitCode = "...";
        }
        return "[" + exitCode + "]: " + outputContent;
    }

    private handleNotificationHiding(outputStreamName: OutputStream) {

        // Hide by timeout
        let normalTimeout: number;
        switch (outputStreamName) {
            case "stdout":
                normalTimeout = this.plugin.getNotificationMessageDurationMs();
                break;
            case "stderr":
                normalTimeout = this.plugin.getErrorMessageDurationMs();
                break;
        }
        this.realtimeNoticeTimeouts[outputStreamName] = window.setTimeout(
            () => {
                // Hide the Notice
                this.realtimeNotices[outputStreamName].hide();
                this.realtimeNotices[outputStreamName] = undefined;
                this.realtimeNoticeTimeouts[outputStreamName] = undefined;
            },
            normalTimeout,
        );

        // Subscribe to Notice's click event.
        // @ts-ignore Notice.noticeEl belongs to Obsidian's PRIVATE API, and it may change without a prior notice. Only
        // define the click listener if noticeEl exists and is an HTMLElement.
        const noticeEl = this.realtimeNotices[outputStreamName].noticeEl;
        if (undefined !== noticeEl && noticeEl instanceof HTMLElement) {
            noticeEl.onClickEvent(() => {
                window.clearTimeout(this.realtimeNoticeTimeouts[outputStreamName]); // Make sure timeout will not accidentally try to later hide an already hidden Notification.
                this.realtimeNoticeTimeouts[outputStreamName] = undefined;
                this.realtimeNotices[outputStreamName] = undefined; // Give a signal to _handleRealtime() that if new output comes, a new Notice should be created.
            });
        }
    }
}