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
        switch (this.state) {
            case "idle":
                // IDLE PHASE.
                switch (this.configuration.mode) {
                    case "early-execution":
                    case "early-and-late-execution":{
                        // Execute immediately.
                        await this.execute(scEvent);
                        break;
                    }
                    case "late-execution":{
                        // Begin a cooldown phase and execute after it.
                        debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " is delayed.");
                        this.subsequent = {
                            scEvent: scEvent,
                        };
                        await this.cooldown();
                        break;
                    }
                }
                break;
            default:
                // EXECUTING OR COOLDOWN PHASE.
                switch (this.configuration.mode) {
                    case "early-execution":
                    case "late-execution": {
                        // Nothing to do - just discard this execution.
                        debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " execution is discarded.");
                        break;
                    }
                    case "early-and-late-execution": {
                        // Wait until previous execution is over and a cooldown phase is passed, too.
                        debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " execution is postponed and may be merged to a later one.");
                        this.subsequent = { // Override throttle.subsequent if it contained an earlier waiter. After the cooldown is over, always execute the newest thing.
                            scEvent: scEvent,
                        };
                        break;
                    }
                }
                break;
        }
    }
    
    private async execute(scEvent: SC_Event): Promise<void> {
        this.state = "executing";
        debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " will be executed now.");
        const executor = new ShellCommandExecutor(this.plugin, this.tShellCommand, scEvent);
        await executor.doPreactionsAndExecuteShellCommand();
        await this.afterExecuting();
    }
    
    private async afterExecuting(): Promise<void> {
        debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " execution ended.");
        switch (this.configuration.mode) {
            case "early-execution": {
                // Not much to do anymore, go to cooldown and clear state after it.
                await this.cooldown();
                break;
            }
            case "late-execution": {
                // Clear state.
                this.state = "idle";
                break;
            }
            case "early-and-late-execution": {
                // Go to cooldown and see after that if there's anything more to execute.
                await this.cooldown();
                break;
            }
        }
    }
    
    private cooldown(): Promise<void> {
        return new Promise((resolve) => {
            this.state = "cooldown";
            debugLog("Throttling control: Shell command id " + this.tShellCommand.getId() + " is in cooldown phase now.");
            window.setTimeout(
                () => {
                    this.afterCooldown().then(resolve);
                },
                this.getCoolDownMilliseconds()
            );
        });
    }
    
    private async afterCooldown(): Promise<void> {
        const debugMessageBase = "Throttling control: Shell command id " + this.tShellCommand.getId() + " \"cooldown\" phase ended, ";
        switch (this.configuration.mode) {
            case "early-execution": {
                // Not much to do after cooldown.
                debugLog(debugMessageBase + "throttling ended.");
                this.state = "idle";
                break;
            }
            case "late-execution":
            case "early-and-late-execution": {
                if (this.subsequent) {
                    // There is a next execution waiting to be started.
                    debugLog(debugMessageBase + "will start a previously postponed execution.");
                    const executeWithEvent: SC_Event = this.subsequent.scEvent;
                    this.subsequent = null;
                    await this.execute(executeWithEvent);
                    
                } else {
                    // No need to start another execution process. (We should only end up here in mode "early-and-late-execution", not in mode "late-execution").
                    debugLog(debugMessageBase + "no postponed execution is waiting, so will not re-execute.");
                    this.state = "idle";
                    this.subsequent = null;
                }
                break;
            }
        }
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