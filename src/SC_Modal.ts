import {Modal} from "obsidian";
import SC_Plugin from "./main";

export abstract class SC_Modal extends Modal {

    protected constructor (
        protected readonly plugin: SC_Plugin
    ) {
        super(plugin.app);
    }

}