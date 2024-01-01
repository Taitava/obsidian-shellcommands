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

import {Instance} from "../Instance";
import SC_Plugin from "../../main";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {getIDGenerator} from "../../IDGenerator";
import {OutputWrapperModel} from "./OutputWrapperModel";
import {UsageContainer} from "../../imports";
import {OutputStream} from "../../output_channels/OutputHandlerCode";
import {VariableMap} from "../../variables/loadVariables";
import {getUsedVariables} from "../../variables/parseVariables";

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

    public getContent() {
        return this.configuration.content;
    }

    public getConfiguration() {
        return this.configuration;
    }
    
    protected _getUsages(): UsageContainer {
        const usages: UsageContainer = new UsageContainer(this.getTitle());
    
        for (const tShellCommand of this.plugin.getTShellCommandsAsMap().values()) {
            let outputStream: OutputStream;
            for (outputStream of ["stdout", "stderr"] as OutputStream[]) {
                if (tShellCommand.getConfiguration().output_wrappers[outputStream] === this.getID()) {
                    usages.addUsage(
                        {
                            title: tShellCommand.getAliasOrShellCommand(),
                        },
                        "shellCommands",
                    );
                }
            }
        }
        
        return usages;
    }
    
    /**
     * Returns {{variables}} used in the OutputWrapper's content.
     *
     * @protected
     */
    protected _getUsedCustomVariables(): VariableMap {
        // Gather parseable content.
        const readVariablesFrom: string[] = [
            this.configuration.content,
        ];
        
        return getUsedVariables(
            this.plugin,
            readVariablesFrom,
            this.plugin.getCustomVariables(),
        );
    }
}

export interface OutputWrapperConfiguration {
    id: string;
    title: string;
    content: string;
}