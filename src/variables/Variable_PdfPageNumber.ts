/*
 * PdfPageNumber variable for obsidian-shellcommands.
 * Returns the current page number of the active PDF view in Obsidian.
 */
import { Variable } from "./Variable";
import SC_Plugin from "../main";
import { Shell } from "../shells/Shell";

export class Variable_PdfPageNumber extends Variable {
    public variable_name = "pdf_page_number";
    public help_text = "Returns the page number of the currently active PDF file. Throws error if unavailable.";
    protected always_available = false;

    constructor(plugin: SC_Plugin) {
        super(plugin);
    }

    protected async generateValue(shell: Shell): Promise<string> {
        // Attempt to access the current PDF view from Obsidian workspace
        const app = this.plugin.app;
        const activeView = (app.workspace as any).getActiveFileView?.();
        if (!activeView || activeView.getViewType?.() !== "pdf") {
            this.throw("No active PDF file is open or view is not available.");
        }
        // Access the PDF page number property in view
        const pageNumber = activeView.viewer?.child?.pdfViewer?.pdfViewer?.currentPageNumber;
        if (typeof pageNumber === "number") return String(pageNumber);
        this.throw("Current PDF page number is unavailable.");
    }
}