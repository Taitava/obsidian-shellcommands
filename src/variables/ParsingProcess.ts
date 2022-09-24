/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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
    parseVariables,
    ParsingResult,
} from "./parseVariables";
import SC_Plugin from "../main";
import {SC_Event} from "../events/SC_Event";
import {VariableSet} from "./loadVariables";
import {
    cloneObject,
    uniqueArray,
} from "../Common";
import {TShellCommand} from "../TShellCommand";
import {debugLog} from "../Debug";

/**
 * ParsingProcess instances can be used in situations where it's uncertain can all variables be parsed at the time being,
 * i.e. when parsing shell commands (and aliases), as they can have preactions which require parsing to be done in two phases.
 *
 * Also, shell commands are often parsed in advance for command palette and context menus. Then it's good to store the parsing
 * result by using instances of this class.
 *
 * Then again, if the parsing use-case is simpler, e.g. Prompt description or prompt field values, it's more straightforward
 * to just call parseVariables() without utilising this class. After all, this class is a wrapper for parseVariables().
 *
 * <ParsingMap> is a generalization for defining keys for an object that will be used for submitting the original parseable
 * content. The same keys will then be used to form another object containing the parsing results.
 */
export class ParsingProcess<ParsingMap extends {[key: string]: string}> {

    private readonly parsing_results: ParsingResultContainer<ParsingMap> = {};

    constructor(
        private plugin: SC_Plugin,
        private original_contents: ParsingMap,

        /** Used to get a shell (getShell()) and default values for variables. */
        private t_shell_command: TShellCommand,
        private sc_event: SC_Event | null,

        /**
         * When .process() is called, it will shift and process the first VariableSet present in this array. So, the next call
         * will shift and process the next set.
         */
        private variable_sets: VariableSet[],

        /**
         * This can be used to mark certain contents to always avoid escaping special characters in their variable values.
         * This should only be used for content that is never submitted to a shell, i.e. output wrappers at the moment.
         *
         * This is a list of 'content keys'.
         */
        private avoid_escaping: (keyof ParsingMap)[] = [],
    ) {
        debugLog("Parsing process: Count variable sets: " + this.variable_sets.length);
    }

    private is_first_call = true;
    /**
     * Performs the next step in the parsing process. The step can be the first one, or a subsequent step.
     *
     * @return True if parsing succeeded, false otherwise. Read the results by calling .getParsingResult().
     */
    public async process(): Promise<boolean> {
        const current_variables = this.variable_sets.shift();
        let success = true;

        debugLog("Parsing process: Count variables in current set: " + current_variables.size);

        // Multiple contents can be parsed in the same call. TShellCommand instances have 'shell_command' and 'alias'
        // contents which are parsed at the same time. This multi-content support can be used for even more situations if
        // needed in the future.
        for (const content_key of this.getContentKeys()) {

            let parse_content: string;
            if (this.is_first_call) {
                // Use original content.
                parse_content = this.original_contents[content_key];
                debugLog("Starting to parse '" + content_key + "': " + parse_content);
            } else {
                // Continue parsing content from previous parsing result. This time parse variables that were not parse back then.
                // FIXME: Problem: variable values that came from an earlier phase are exposed to repetitive parsing. Find a way to limit the parsing to only original parts of the shell command.
                parse_content = this.parsing_results[content_key].parsed_content;
                debugLog("Continuing parsing '" + content_key + "': " + parse_content);
            }

            // Parse the variables
            const parsing_result = await parseVariables(
                this.plugin,
                parse_content,
                this.avoidEscaping(content_key) ? null : this.t_shell_command.getShell(), // If no escaping is needed, pass null.
                this.t_shell_command,
                this.sc_event,
                current_variables,
            );

            // Check if the parsing succeeded or failed.
            success = success && parsing_result.succeeded; // Flag as failed also if a previous phase has failed.

            // Store the parsing result
            this.mergeToParsingResults(content_key, parsing_result);
        }

        // Finish
        this.is_first_call = false;
        return success;
    }

    /**
     * A wrapper for .process() that processes all the VariableSets that are still left unprocessed.
     *
     * @return True if parsing all sets succeeded, false otherwise.
     */
    public async processRest(): Promise<boolean> {
        // 1. Check a previous parsing result (if exists).
        for (const content_key of this.getContentKeys()) {
            if (this.parsing_results[content_key]) {
                // A previous parsing result exists.
                // Ensure it has not failed.
                debugLog("Previous parsing succeeded? " + this.parsing_results[content_key].succeeded);
                if (!this.parsing_results[content_key].succeeded) {
                    // The previous parsing result has failed.
                    return false;
                }
            }
        }

        // 2. Process the rest of the VariableSets.
        for (let i = 0; i < this.variable_sets.length; i++) {
            if (!await this.process()) {
                return false;
            }
        }
        return true;
    }

    public getParsingResults() {
        return this.parsing_results;
    }

    /**
     * Calls SC_Plugin.newErrors() to create visible error balloons for all the issues encountered during parsing.
     */
    public displayErrorMessages(): void {
        this.plugin.newErrors(this.getErrorMessages());
    }

    /**
     * @private Can be made public if needed.
     */
    private getErrorMessages() {
        let error_messages: string[] = [];
        for (const content_key of this.getContentKeys()) {
            error_messages.push(
                ...this.parsing_results[content_key].error_messages,
            );
        }

        // Remove duplicate error messages. When parsing 'shell_command' and 'alias', they can contain same variables and
        // therefore generate same error messages.
        error_messages = uniqueArray(error_messages);

        return error_messages;
    }

    private getContentKeys(): (keyof ParsingMap)[] {
        return Object.getOwnPropertyNames(this.original_contents) as (keyof ParsingMap)[];
    }

    /**
     * Merges consecutive parsing results together so that information from both the old and new parsing results can be preserved.
     */
    private mergeToParsingResults(content_key: keyof ParsingMap, parsing_result: ParsingResult) {
        if (!this.parsing_results[content_key]) {
            // No need to merge. But clone the object so that possible future merges will not mess up the original object in case it's used somewhere else.
            this.parsing_results[content_key] = cloneObject(parsing_result);
        } else {
            // Merge
            // NOTE: this.parsing_results[content_key].original_content IS KEPT UNCHANGED! The newer "original" content is not actually original, because it's partly parsed. That's why the old one is preserved.
            this.parsing_results[content_key].parsed_content = parsing_result.parsed_content; // New parsed content overrides the old one.
            this.parsing_results[content_key].succeeded &&= parsing_result.succeeded; // Both the old and new parsing must have succeeded in order to consider the whole process succeeded.
            this.parsing_results[content_key].error_messages.push(...parsing_result.error_messages); // Include both old and new error messages.
            this.parsing_results[content_key].count_parsed_variables += parsing_result.count_parsed_variables; // Sum up the variable usage counts. At the time of writing, the sum is only used for determining if there were any variables parsed or not, so an accurate sum is not used atm.
        }
    }

    /**
     * Tells whether the given content_key has a mark that special characters in the content's variable values should not be escaped.
     *
     * @param content_key
     * @private
     */
    private avoidEscaping(content_key: keyof ParsingMap): boolean {
        return this.avoid_escaping.contains(content_key);
    }
}

type ParsingResultContainer<ParsingMap> = {
    [key in keyof ParsingMap]?: ParsingResult;
};