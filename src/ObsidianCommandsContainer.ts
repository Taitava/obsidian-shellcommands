import {Command} from "obsidian";

export interface ObsidianCommandsContainer {
    [key: string]: Command;
}