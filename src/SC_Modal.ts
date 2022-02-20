import {Modal} from "obsidian";
import SC_Plugin from "./main";

export abstract class SC_Modal extends Modal {

    protected constructor (
        protected readonly plugin: SC_Plugin
    ) {
        super(plugin.app);
    }

    public onOpen(): void {

        // Make the modal scrollable if it has more content than what fits in the screen.
        this.modalEl.addClass("SC-scrollable");

    }

    protected setTitle(title: string) {
        this.titleEl.innerText = title;
    }

}