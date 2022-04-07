import {
    EventVariable,
    getFileExtension,
    IAutocompleteItem,
    IParameters,
    SC_Event_FileMenu,
} from "src/imports";

export class Variable_EventFileExtension extends EventVariable {
    public variable_name = "event_file_extension";
    public help_text = "Gives the selected file name's ending. Use {{event_file_extension:with-dot}} to include a preceding dot. If the extension is empty, no dot is added. {{event_file_extension:no-dot}} never includes a dot.";

    protected static parameters: IParameters = {
        "dot": {
            options: ["with-dot", "no-dot"],
            required: true,
        },
    };

    protected arguments: {
        "dot": "with-dot" | "no-dot",
    }

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        const file = sc_event.getFile();
        return getFileExtension(file, this.arguments.dot === "with-dot");
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dot}}",
                help_text: "Gives the selected file name's ending without a preceding dot. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dot}}",
                help_text: "Gives the selected file name's ending with a preceding dot. If the extension is empty, no dot is included. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dot}}",
                help_text: "Gives the selected file name's ending without a preceding dot. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dot}}",
                help_text: "Gives the selected file name's ending with a preceding dot. If the extension is empty, no dot is included. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_file_extension:with-dot}}</strong> or <strong>{{event_file_extension:no-dot}}</strong>";
    }

}