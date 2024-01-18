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
import {OutputChannel} from "./OutputChannel";
import {
    OutputHandlerApplicableConfiguration,
    OutputStream,
} from "./OutputHandlerCode";
import {debugLog} from "../Debug";
import {VariableSet} from "../variables/loadVariables";
import {CustomVariable} from "../variables/CustomVariable";
import {EOL} from "os";

export class OutputChannel_AssignCustomVariables extends OutputChannel {
    
    protected static readonly title = "Assign custom variables";
    
    /**
     * This output channel is not suitable for stderr, as stderr can contain unexpected messages.
     * @protected
     */
    protected static readonly accepted_output_streams: OutputStream[] = ["stdout"];
    
    /**
     * There really shouldn't be anything to combine, because stderr is disabled for this output handled. Just use a string
     * here to indicate that _handleBuffered() expects a simple string value, not an OutputStreams object.
     *
     * @protected
     */
    protected static readonly combine_output_streams = "";
    
    // I guess this output handler is so rarely used it's not needed in the 'Ask after execution' modal. If this decision is changed, "U" could be a candidate.
    // public static readonly hotkey_letter = "U";
    
    /**
     * When assigning values to variables, the output is not supposed to have any ANSI codes, as it's just JSON.
     *
     * @protected
     */
    protected static override readonly applicableConfiguration: OutputHandlerApplicableConfiguration = {
        convert_ansi_code: false, // The output should be just JSON, no ANSI code in there.
    };
    
    protected async _handleBuffered(outputContent: string): Promise<void> {
        await this.assignCustomVariablesFromJSON(outputContent);
        
    }
    protected async _handleRealtime(outputContent: string): Promise<void> {
        await this.assignCustomVariablesFromJSON(outputContent);
    }
    
    private async assignCustomVariablesFromJSON(variablesJSON: string) {
        
        // Parse the JSON.
        debugLog("OutputChannel_AssignCustomVariables: Starting to interpret JSON: ", variablesJSON);
        let assignableVariables: object | unknown;
        try {
            assignableVariables = JSON.parse(variablesJSON);
        } catch (exception) {
            if (exception instanceof SyntaxError) {
                // JSON syntax error occurred.
                debugLog("OutputChannel_AssignCustomVariables: Malformed JSON:", variablesJSON);
                this.newError(`JSON syntax error: ${EOL}${EOL}${exception.message}${EOL}${EOL}${variablesJSON}`);
                return;
            } else {
                throw exception;
            }
        }
        
        // Check that the JSON contained an object.
        if ("object" !== typeof assignableVariables || assignableVariables === null) {
            debugLog("OutputChannel_AssignCustomVariables: JSON is not an object:", variablesJSON);
            this.newError(`Expected an object like {"{{_myCustomVariable}}": "A value"}, received instead: ${EOL}${EOL}${variablesJSON}`);
            return;
        }
        
        // Get all CustomVariables.
        const customVariables: VariableSet = this.plugin.getCustomVariables();
        
        let showReceivedJSON = false; // Becomes true if any errors occur. In case of errors with multiple variables/JSON properties, avoid showing the whole JSON repeatedly.
        for (const assignableVariableName of Object.getOwnPropertyNames(assignableVariables)) {
            // 1. Check the variable name's format generally.
            if (!assignableVariableName.match(CustomVariable.getCustomVariableValidNameRegex(true))) {
                // Malformed CustomVariable name.
                this.newError(`Property names should be like _myCustomVariable, received instead: ${assignableVariableName}`);
                showReceivedJSON = true;
                continue; // Next variable.
            }
            
            // 2. Check that the variable exists.
            let variableFound = false;
            for (const customVariable of customVariables) {
                if (!(customVariable instanceof CustomVariable)) {
                    // This should not happen.
                    throw new Error(this.constructor.name + ": Got a variable that is not a CustomVariable.");
                }
                if (customVariable.getFullName() === "{{" + assignableVariableName + "}}") {
                    // Found the variable.
                    variableFound = true;
                    // @ts-ignore assignableVariables[assignableVariableName] is assigned.
                    const assignableVariableValue: unknown = assignableVariables[assignableVariableName];
                    if (typeof assignableVariableValue === "string") {
                        // The value can be assigned to the variable.
                        await customVariable.setValue(assignableVariableValue);
                    } else {
                        // The value has a wrong data type.
                        this.newError(`Currently, only string values are supported for custom variables. ${assignableVariableName} was tried to be given this: ${JSON.stringify(assignableVariableValue)}`);
                        showReceivedJSON = true;
                    }
                    break;
                }
            }
            if (!variableFound) {
                this.newError(`Variable with name ${assignableVariableName} does not exist.`);
                showReceivedJSON = true;
                continue; // Next variable.
            }
        }
        if (showReceivedJSON) {
            this.plugin.newError(`Received output JSON:${EOL}${variablesJSON}`);
            // This is a second notification balloon, so avoid repeating Assign custom variables:" by not using this.newError().
        }
        debugLog("OutputChannel_AssignCustomVariables: Finished interpreting JSON successfully: ", variablesJSON);
    }
}