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
    OutputWrapperModel,
    PromptFieldModel,
    PromptModel,
} from "../imports";

export interface Usage {
    title: string,
    // Can later contain e.g. Instance, if advanced details of the Usage are needed. Just need to make the Instance optional, as not all Usages are Model-based.
}

export interface UsageCategory {
    singularName: string,
    pluralName: string,
}

export const UsageCategories: {
    [key: string]: UsageCategory,
} = {
    // Keep in alphabetical order by 'singularName'! The order affects UI listings.
    customShells: {
        singularName: "Custom shell",
        pluralName: "Custom shells",
    },
    platforms: {
        singularName: "Operating system",
        pluralName: "Operating systems",
    },
    outputWrappers: {
        singularName: OutputWrapperModel.getSingularName(),
        pluralName: OutputWrapperModel.getPluralName(),
    },
    prompts: {
        singularName: PromptModel.getSingularName(),
        pluralName: PromptModel.getPluralName(),
    },
    promptFields: {
        singularName: PromptFieldModel.getSingularName(),
        pluralName: PromptFieldModel.getPluralName(),
    },
    shellCommands: {
        singularName: "Shell command",
        pluralName: "Shell commands",
    },
    variables: { // For both builtin and custom variables.
        singularName: "Variable",
        pluralName: "Variables",
    },
    // Keep in alphabetical order by 'singularName'!
};

export type UsageCategoryId = keyof typeof UsageCategories; // FIXME: This is now actually string, so accepts also other strings than the keys of UsageCategories. Make it stricter.

