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

import {Variable} from "./Variable";

export abstract class FileVariable extends Variable {

    protected always_available = false;

    protected getFile() {
        const current_file = this.getActiveFile();
        if (!current_file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null;
        }
        return current_file;
    }

    public isAvailable(): boolean {
        const current_file = this.getActiveFile();
        return !!current_file;
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when the active pane contains a file, not in graph view or other non-file view.";
    }

    private getActiveFile() {
        return this.app.workspace.getActiveFile();
    }
}