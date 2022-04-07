import {TFile} from "obsidian";
import {
    EventVariable,
    getFileYAMLValue,
    IParameters,
    SC_Event_FileMenu,
} from "src/imports";

export class Variable_EventYAMLValue extends EventVariable {
    public variable_name = "event_yaml_value";
    public help_text = "Reads a single value from the selected file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        property_name: string;
    }

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        const file = sc_event.getFile();
        const result = this.getFileYAMLValue(file);
        if (Array.isArray(result)) {
            // The result contains error message(s).
            this.newErrorMessages(result as string[]);
            return null;
        } else {
            // The result is ok, it's a string.
            return result as string;
        }
    }

    private yaml_value_cache: string[] | string;
    private getFileYAMLValue(active_file: TFile): string[] | string {
        if (!this.yaml_value_cache) {
            this.yaml_value_cache = getFileYAMLValue(this.app, active_file, this.arguments.property_name);
        }
        return this.yaml_value_cache;
    }

    public reset(): void {
        super.reset();
        this.yaml_value_cache = undefined;
    }

    public isAvailable(sc_event: SC_Event_FileMenu | null): boolean {
        if (!super.isAvailable(sc_event)) {
            return false;
        }

        const active_file = sc_event.getFile();
        return typeof this.getFileYAMLValue(active_file) === "string";
    }
}