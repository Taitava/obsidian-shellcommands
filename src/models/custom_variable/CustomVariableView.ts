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

import {
    ItemView,
    WorkspaceLeaf,
} from "obsidian";
import SC_Plugin from "../../main";

export class CustomVariableView extends ItemView {

    public static ViewType = "SC-custom-variables-view";

    constructor(
        private plugin: SC_Plugin,
        leaf: WorkspaceLeaf
    ) {
        super(leaf);
    }

    public getDisplayText(): string {
        return "Custom variables";
    }

    public getViewType(): string {
        return CustomVariableView.ViewType;
    }

    public getIcon() {
        return "code-glyph";
    }

    private container_element: HTMLDivElement;
    protected async onOpen(): Promise<void> {
        this.container_element = this.containerEl.children[1].createDiv(); // I don't know why I cannot create elements directly under this.containerEl (they wouldn't show up). I did the same thing as was done here: https://marcus.se.net/obsidian-plugin-docs/guides/custom-views (referenced 2022-03-23).
        this.container_element.addClass("container");

        await this.updateContent();
    }

    public async updateContent() {
        this.container_element.empty();
        this.container_element.createEl("h3", {text: "Custom variables"});
        const variableListElement: HTMLUListElement = this.container_element.createEl("ul");
        for (const customVariableInstance of this.plugin.getCustomVariableInstances().values()) {
            let customVariableValue: string | null = customVariableInstance.getCustomVariable().getCustomVariableValue();
            let customVariableState: string | null = null;
            if (!customVariableInstance.getCustomVariable().hasOwnValue()) {
                // The variable has no value yet.
                if ("value" === customVariableInstance.configuration.default_value?.type) {
                    // Indicate that the variable has a default value defined, which will practically be used as long as no overriding value is set.
                    if ("" === customVariableInstance.configuration.default_value.value.trim()) {
                        customVariableState = "No value yet, but defaults to: An empty text.";
                    } else {
                        customVariableState = "No value yet, but defaults to: "; // The value will appear next to the state text later below.
                        customVariableValue = customVariableInstance.configuration.default_value.value;
                    }
                } else {
                    // No default value is defined, so no value is accessible.
                    customVariableState = "No value yet.";
                }
            } else if ("" === customVariableValue) {
                customVariableState = "An empty text.";
            }
            const variableListItemElement = variableListElement.createEl("li", {
                text: customVariableInstance.getFullName(),
                attr: {
                    "aria-label": customVariableInstance.configuration.description,
                    "class": "SC-custom-variable-view-list-item",
                },
            });
            variableListItemElement.createEl("br");
            if (null !== customVariableState) {
                variableListItemElement.createEl("em").insertAdjacentText("beforeend", customVariableState);
            }
            if (null !== customVariableValue) {
                // Bold normal values to make them more prominent in contrast to variable names and "No value yet."/"An empty text." texts.
                variableListItemElement.createEl("strong").insertAdjacentText("beforeend", customVariableValue);
            }
        }
    }

}