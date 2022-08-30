/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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

import {Instance} from "../Instance";
import SC_Plugin from "../../main";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {getIDGenerator} from "../../IDGenerator";
import {OutputWrapperModel} from "./OutputWrapperModel";
import {parseVariables} from "../../variables/parseVariables";
import {Variable_Output} from "../../variables/Variable_Output";
import {TShellCommand} from "../../TShellCommand";
import {debugLog} from "../../Debug";

export class OutputWrapper extends Instance {

    constructor(
        public model: OutputWrapperModel,
        protected plugin: SC_Plugin,
        public configuration: OutputWrapperConfiguration,
        public parent_configuration: SC_MainSettings,
    ) {
        super(model, configuration, parent_configuration);

        // Introduce the ID to an ID generator so that it won't accidentally generate the same ID again when creating new OutputWrappers.
        getIDGenerator().addReservedID(configuration.id);
    }

    public getID() {
        return this.configuration.id;
    }

    public getTitle() {
        return this.configuration.title;
    }

    public getConfiguration() {
        return this.configuration;
    }

    /**
     * Wraps the given output text and parses variables in the output wrapper's content and returns the parsing result.
     * If the parsing fails, displays error messages and returns the original output content.
     *
     * @param output_content
     * @param t_shell_command
     */
    public wrapOutput(output_content: string, t_shell_command: TShellCommand): string {
        const variables = this.plugin.getVariables();
        variables.forEach((variable) => {
            if (variable instanceof Variable_Output) {
                // Pass output_content to {{output}} variable.
                variable.setOutputContent(output_content);
            }
        });

        // Parse variables
        const parsing_result = parseVariables(
            this.plugin,
            this.configuration.content,
            null,
            t_shell_command,
            null,
            variables,
        );

        // Check the parsing result
        if (parsing_result.succeeded) {
            // Parsing succeeded
            debugLog("Output wrapper: Variable parsing succeeded.")
            return parsing_result.parsed_content;
        } else {
            // Parsing failed.
            // Show error messages and fallback to use the original output_content without modifications.
            debugLog("Output wrapper: Variable parsing failed: " + parsing_result.error_messages.join(" "));
            this.plugin.newError("Output wrapper '" + this.getTitle() + "': Variable parsing failed, see error below. The output text will be used without a wrapper.");
            this.plugin.newErrors(parsing_result.error_messages);
            return output_content;
        }
    }

}

export interface OutputWrapperConfiguration {
    id: string;
    title: string;
    content: string;
}