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
import {TShellCommand} from "./TShellCommand";
import {SC_Event} from "./events/SC_Event";
import {debugLog} from "./Debug";
import {ShellCommandExecutor} from "./ShellCommandExecutor";
import SC_Plugin from "./main";

export class Throttler {
    
    private state: ThrottleState = "idle";
    private subsequent: null | {
        scEvent: SC_Event,
        // Just a single property, but use still an object structure, so it's easy to add more properties later, if needed. E.g. a ParsingProcess.
    } = null;
    
    constructor(
        private plugin: SC_Plugin,
        private configuration: ThrottleConfiguration,
        private tShellCommand: TShellCommand,
    ) {
        if (!configuration) {
            throw new Error("Throttler can only be instantiated with a shell command that has throttle enabled.");
        }
    }
    
    public async executeWithThrottling(scEvent: SC_Event): Promise<void> {
        if (this.state === "idle") {
            // Execute immediately.
            debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " will be executed now.");
            // Change state.
            this.state = "executing";
            
            // Execute this shell command.
            const executor = new ShellCommandExecutor(this.plugin, this.tShellCommand, scEvent);
            await executor.doPreactionsAndExecuteShellCommand();
            await this.handleThrottlingAfterExecution();
        } else {
            // Wait until previous execution is over and a cooldown phase is passed, too.
            debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " execution is postponed.");
            this.subsequent = { // Override throttle.subsequent if it contained an earlier waiter. After the cooldown is over, always execute the newest thing.
                scEvent: scEvent,
            };
        }
    }
    
    private async handleThrottlingAfterExecution(): Promise<void> {
        if (this.state !== "executing") {
            throw new Error("Cannot call Throttler.handleThrottlingAfterExecution() if throttling state is different from \"executing\". Now it's: " + this.state);
        }
        debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " execution is finished, throttling enters \"cooldown\" phase.");
        this.state = "cooldown";
        window.setTimeout(() => {
            const debugMessageBase = "Throttling control: Shell command id " + this.tShellCommand.getId() + " \"cooldown\" phase ended, ";
            if (this.subsequent) {
                // There is a next execution waiting to be started.
                debugLog(debugMessageBase + "will start a previously postponed execution.");
                
                const executeWithEvent: SC_Event = this.subsequent.scEvent;
                
                // Indicate to this.executeWithThrottling() that execution can be done immediately.
                this.state = "idle";
                this.subsequent = null;
                this.executeWithThrottling(executeWithEvent);
                
            } else {
                // No need to start another execution process.
                debugLog(debugMessageBase + "no postponed execution is waiting, so will not re-execute.");
                this.state = "idle";
                this.subsequent = null;
            }
        }, this.getCoolDownMilliseconds());
    }
    
    private getCoolDownMilliseconds(): number {
        return this.configuration.coolDown * 1000;
    }
}

type ThrottleMode = "early-execution" | "late-execution" | "early-and-late-execution";

type ThrottleState = "idle" | "executing" | "cooldown";

export interface ThrottleConfiguration {
    mode: ThrottleMode,
    coolDown: number,
}