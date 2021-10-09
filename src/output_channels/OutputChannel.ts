/**
 * Designed additional values for later: "modal" | "current-file-bottom" | "specific-file-top" | "specific-file-bottom" | "specific-file-caret" (if possible)
 * See discussion: https://github.com/Taitava/obsidian-shellcommands/discussions/16
 */
export type OutputChannel = "ignore" | "notification" | "current-file-caret" | "current-file-top" | "status-bar";

export type OutputChannelOrder = "stdout-first" | "stderr-first";

export type OutputStream = "stdout" | "stderr";