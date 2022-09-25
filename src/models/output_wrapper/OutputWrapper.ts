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
}

export interface OutputWrapperConfiguration {
    id: string;
    title: string;
    content: string;
}