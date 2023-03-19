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
import {OutputStreams} from "./OutputChannelFunctions";
import {OutputStream} from "./OutputHandlerCode";
import {
    Notice,
    sanitizeHTMLToDom,
} from "obsidian";

export class OutputChannel_Notification extends OutputChannel {

    /**
     * All received output cumulatively. Subsequent handlings will then use the whole output, not just new parts.
     * Only used in "realtime" mode.
     *
     * @private
     */
    private realtimeContentBuffer = "";

    /**
     * Holds a Notice instance so that the message can be updated during subsequent handlings.
     * Only used in "realtime" mode.
     *
     * @private
     */
    private realtimeNotice: Notice | undefined;

    private realtimeNoticeTimeout: number | undefined;

    /**
     * A flag for indicating that if any stderr output has happened, all subsequent handlings should format the output
     * Notice message with error formatting (i.e. show [...] at the beginning of the message).
     * @private
     */
    private realtimeHasStderrOccurred = false;

    public static getTitle(output_stream: OutputStream): string {
        switch (output_stream) {
            case "stdout":
                return "Notification balloon";
            case "stderr":
                return "Error balloon";
        }
    }

    protected async _handleBuffered(output: OutputStreams, error_code: number | null): Promise<void> {

        // Iterate output streams.
        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, two
        // notifications will be created.
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {
            const output_message: string = output[output_stream_name] as string; // as string = output message is not undefined because of the for loop.
            this.notify(output_stream_name, output_message, error_code);
        }
    }

    protected async _handleRealtime(outputContent: string, outputStreamName: OutputStream): Promise<void> {

        // Append new content
        this.realtimeContentBuffer += outputContent;

        // Raise a flag if seeing 'stderr' output.
        if ("stderr" === outputStreamName) {
            this.realtimeHasStderrOccurred = true;
        }

        // Does a Notice exist already?
        if (this.realtimeNotice) {
            // Reuse an existing Notice.

            // Should output be formatted as an error message?
            let updatedMessage: string;
            if (this.realtimeHasStderrOccurred) {
                // Apply error formatting to output
                updatedMessage = OutputChannel_Notification.formatErrorMessage(this.realtimeContentBuffer, null);
            } else {
                // Use output as-is
                updatedMessage = this.realtimeContentBuffer;
            }

            // Use the updated output
            this.realtimeNotice.setMessage(this.prepareHTML(updatedMessage));

            // Update notice hiding timeout
            window.clearTimeout(this.realtimeNoticeTimeout); // Remove old timeout
            this.handleNotificationHiding(outputStreamName); // Add new timeout
        } else {
            // Create a new Notice.
            this.realtimeNotice = this.notify(
                this.realtimeHasStderrOccurred ? "stderr" : "stdout",
                this.realtimeContentBuffer,
                null,
                0, // Use 0 timeout so that the Notice won't hide automatically.
            );

            // Create a timeout for hiding the Notice
            this.handleNotificationHiding(outputStreamName);
        }

        // Terminating button
        // @ts-ignore Notice.noticeEl belongs to Obsidian's PRIVATE API, and it may change without a prior notice. Only
        // create the button if noticeEl exists and is an HTMLElement.
        const noticeEl = this.realtimeNotice.noticeEl;
        if (null === this.processTerminator) {
            throw new Error("Process terminator is not set, although it should be set when handling output in realtime mode.");
        }
        if (undefined !== noticeEl && noticeEl instanceof HTMLElement) {
            this.plugin.createRequestTerminatingButton(noticeEl, this.processTerminator);
        }
    }

    protected _endRealtime(exitCode: number | null): void {
        if (exitCode !== 0 || this.realtimeHasStderrOccurred) {
            // If a Notice exists, update it with the exitCode
            this.realtimeNotice?.setMessage(
                this.prepareHTML(OutputChannel_Notification.formatErrorMessage(
                    this.realtimeContentBuffer,
                    exitCode, // If exitCode is null, it means user terminated the process, and it will show up as "[...]". It's ok, it indicates that no exit code was received.
                )
            ));
        }

        // Remove terminating button
        // @ts-ignore Notice.noticeEl belongs to Obsidian's PRIVATE API, and it may change without a prior notice. Only
        // create the button if noticeEl exists and is an HTMLElement.
        const noticeEl = this.realtimeNotice?.noticeEl;
        if (undefined !== noticeEl && noticeEl instanceof HTMLElement) {
            noticeEl.find(".SC-icon-terminate-process")?.remove(); // ? = Only try to remove if the button exists. It does not exist if .setMessage() was called above as it overwrites all content in the Notice.
        }
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
                return this.plugin.newNotification(
                    this.prepareHTML(outputContent),
                    noticeTimeout ?? undefined,
                );
            case "stderr":
                // Error output
                return this.plugin.newError(
                    this.prepareHTML(OutputChannel_Notification.formatErrorMessage(outputContent, exitCode)),
                    noticeTimeout ?? undefined,
                );
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
        this.realtimeNoticeTimeout = window.setTimeout(
            () => {
                // Hide the Notice
                this.realtimeNotice?.hide(); // ? = Don't try to hide if a user has closed the notification by clicking. See the 'this.realtimeNotice = undefined;' line in the below click handler.
                this.realtimeNotice = undefined;
                this.realtimeNoticeTimeout = undefined;
            },
            normalTimeout,
        );

        // Subscribe to Notice's click event.
        // @ts-ignore Notice.noticeEl belongs to Obsidian's PRIVATE API, and it may change without a prior notice. Only
        // define the click listener if noticeEl exists and is an HTMLElement.
        const noticeEl = this.realtimeNotice.noticeEl;
        if (undefined !== noticeEl && noticeEl instanceof HTMLElement) {
            noticeEl.onClickEvent(() => {
                window.clearTimeout(this.realtimeNoticeTimeout); // Make sure timeout will not accidentally try to later hide an already hidden Notification.
                this.realtimeNoticeTimeout = undefined;
                this.realtimeNotice = undefined; // Give a signal to _handleRealtime() that if new output comes, a new Notice should be created.
            });
        }
    }
    
    /**
     * Wraps the given string content in a `<code></code>` element and creates a DocumentFragment for it.
     * @param outputContent
     * @private
     */
    private prepareHTML(outputContent: string): DocumentFragment {
        return sanitizeHTMLToDom("<code>" + outputContent + "</code>"); // Use <code> instead of <pre> to allow line wrapping.
    }
}