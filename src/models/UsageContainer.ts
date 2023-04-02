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
    Usage,
    UsageCategories,
    UsageCategoryId,
} from "../imports";

type UsageSet = Set<Usage>;

type UsagesByCategoriesMap = Map<UsageCategoryId, UsageSet>;

export class UsageContainer {
    
    constructor(
        /**
         * Name of the entity whose usages are listed.
         */
        private subjectName: string
    ) {}
    private usagesByCategories: UsagesByCategoriesMap = new Map();
    
    public addUsage(usage: Usage, usageCategoryId: UsageCategoryId): void {
        if (this.usagesByCategories.has(usageCategoryId)) {
            this.usagesByCategories.get(usageCategoryId)?.add(usage); // Use ?. because TypeScript does not understand that .get() in this situation never returns undefined.
        } else {
            this.usagesByCategories.set(usageCategoryId, new Set([usage]));
        }
    }
    
    public addUsages(usages: Usage[], usageCategory: UsageCategoryId) {
        for (const usage of usages) {
            this.addUsage(usage, usageCategory);
        }
    }
    
    /**
     * Returns all usages in a 1-dimension Set.
     */
    public getUsages(): UsageSet {
        const allUsages: UsageSet = new Set;
        this.usagesByCategories.forEach((usageSet: UsageSet) => usageSet.forEach((usage: Usage) => allUsages.add(usage)));
        return allUsages;
    }
    
    public hasUsages(): boolean {
        let usageCategory: UsageSet;
        for (usageCategory of this.usagesByCategories.values()) {
            if (usageCategory.size > 0) {
                return true;
            }
        }
        return false;
    }
    
    public countUsages() {
        let countUsages = 0;
        this.usagesByCategories.forEach((usageCategory: UsageSet) => countUsages += usageCategory.size);
        return countUsages;
    }
    
    /**
     * @private Can be made public, if needed.
     */
    private countCategories() {
        return this.usagesByCategories.size;
    }
    
    /**
     * Returns a string containing 'title' properties from all usages. The usages are NOT grouped by category.
     */
    public toSingleLineText(): string {
        return Array.from(this.getUsages()).map((usage: Usage) => usage.title).join(", ");
    }
    
    /**
     * Returns an HTMLDivElement containing a verbose listing of usages, grouped by categories.
     */
    public toHTMLElement(prologueFormat: "long" | "short"): HTMLDivElement {
        const containerElement = document.createElement("div");
        
        // Preparations.
        const countUsages: number = this.countUsages();
        const countCategories: number = this.countCategories();
        const firstUsageCategoryId: UsageCategoryId | undefined = (this.getUsageCategoryIds())[0];
        const isPlural: boolean = countUsages > 1;
        
        // Prologue text.
        let places: string;
        switch (countCategories) {
            case 1: {
                places = UsageCategories[firstUsageCategoryId][isPlural ? "pluralName" : "singularName"].toLocaleLowerCase();
                break;
            }
            default: {
                places = isPlural ? "places" : "place";
                break;
            }
        }
        let prologue: string;
        switch (prologueFormat) {
            case "long":
                prologue = `${this.subjectName} is used in ${countUsages} ${places}:`;
                break;
            case "short":
                prologue = `Used in ${countUsages} ${places}:`;
                break;
        }
        containerElement.createEl("p", {text: prologue});
        
        // List of usages.
        switch (countCategories) {
            case 1: {
                // Just one category.
                // List usages directly.
                this.createListElementForCategory(containerElement, firstUsageCategoryId);
                break;
            }
            default: {
                // Multiple categories.
                // Create nested usage lists.
                const mainListElement = containerElement.createEl("ul");
                for (const usageCategoryId of this.getUsageCategoryIds()) {
                    const usageCategoryListItemElement = mainListElement.createEl("li", {text: UsageCategories[usageCategoryId].pluralName + ":"});
                    this.createListElementForCategory(usageCategoryListItemElement, usageCategoryId); // Will create a nested <ul> element in an <li> element.
                }
                break;
            }
        }
        
        return containerElement;
    }
    
    /**
     * @private Can be made public, if needed.
     */
    private getUsageCategoryIds(): (string | number)[] {
        return Array.from(this.usagesByCategories.keys());
    }
    
    private createListElementForCategory(containerElement: HTMLElement, usageCategoryId: UsageCategoryId): void {
        const listElement: HTMLUListElement = containerElement.createEl("ul");
        for (const usage of this.usagesByCategories.get(usageCategoryId) ?? []) {
            listElement.createEl("li", {text: usage.title});
        }
    }
}