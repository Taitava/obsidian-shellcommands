/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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

import {EventVariable} from "./EventVariable";
import {Shell} from "../../shells/Shell";
import {
    IParameters,
    Variable,
} from "../Variable";
import {
    EventCategories,
    EventTypes,
    SC_Event,
} from "../../events/SC_Event";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";

export class Variable_EventType extends EventVariable {
    public variable_name = "event_type";
    public help_text = "Tells which event was triggered.";
    
    protected static readonly parameters: IParameters = {
        mode: {
            options: ["category"],
            required: false,
        },
    };
    
    /**
     * This variable is available in all events.
     * @protected
     */
    protected supported_sc_events: true  = true;
    
    protected async generateValue(
        shell: Shell,
        castedArguments: {mode?: "category"},
        sc_event: SC_Event,
    ): Promise<string> {
        // Check that an event was triggered, i.e. the execution does not happen via command palette or any other non-event way.
        this.requireCorrectEvent(sc_event);
        
        if (castedArguments.mode === "category") {
            // Get event category.
            return sc_event.getCategory();
        } else {
            // Get event type.
            return sc_event.getType();
        }
    }
    
    public getAutocompleteItems() {
        const autocompleteItems = [
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + "}}",
                help_text: "Gives a name of the triggered event. Possible values: <code>" + EventTypes.join("</code> , <code>") + "</code>. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":category}}",
                help_text: "Gives a category of the triggered event. Multiple events can share the same category. Possible values: <code>" + EventCategories.join("</code> , <code>") + "</code>. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
        Variable.supplementAutocompleteItems(autocompleteItems);
        return autocompleteItems;
    }
    
    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in any event.";
    }
    
    public getHelpName(): string {
        return "<strong>{{event_type}}</strong> or <strong>{{event_type:category}}</strong>";
    }
}