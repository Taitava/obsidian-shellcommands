/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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

import {
    Variable,
} from "../Variable";
import {SC_Event} from "../../events/SC_Event";

export abstract class EventVariable extends Variable {

    protected always_available = false;

    /**
     * @protected
     * @abstract Should be abstract, but cannot mark is as abstract because it's also static.
     */
    protected supported_sc_events: typeof SC_Event[];

    /**
     * Every subclass should call this method in their generateValue() before generating a value. This method will throw
     * a VariableError if an incompatible SC_Event is tried to be used with this {{variable}}.
     *
     * @protected
     */
    protected requireCorrectEvent(sc_event: SC_Event): void {
        // 1. Check generally that an event is happening.
        // (Maybe this check is not so important anymore, as sc_event is now received as a parameter instead of from a property, but check just in case.)
        if (!sc_event) {
            this.throw("This variable can only be used during events: " + this.getSummaryOfSupportedEvents());
        }

        // 2. Check particularly which event it is.
        if (!this.supportsSC_Event(sc_event.getClass())) {
            this.throw("This variable does not support event '" + sc_event.static().getTitle() + "'. Supported events: " + this.getSummaryOfSupportedEvents());
        }
    }

    public supportsSC_Event(sc_event_class: typeof SC_Event): boolean {
        return this.supported_sc_events.contains(sc_event_class);
    }

    private getSummaryOfSupportedEvents(): string {
        const sc_event_titles: string[] = [];
        this.supported_sc_events.forEach((sc_event_class: typeof SC_Event) => {
            sc_event_titles.push(sc_event_class.getTitle());
        });
        return sc_event_titles.join(", ");
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in events: " + this.getSummaryOfSupportedEvents() + ".";
    }
}