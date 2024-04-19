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

export class Debouncer {
    
    private state: DebounceState = "idle";
    private subsequent: null | {
        scEvent: SC_Event,
        // Just a single property, but use still an object structure, so it's easy to add more properties later, if needed. E.g. a ParsingProcess.
    } = null;
    private cooldownTimeout: CooldownTimeout | null = null;
    
    constructor(
        private plugin: SC_Plugin,
        private configuration: DebounceConfiguration,
        private tShellCommand: TShellCommand,
    ) {
        if (!configuration) {
            throw new Error("Debouncer can only be instantiated with a shell command that has `debounce` enabled.");
        }
    }
    
    public async executeWithDebouncing(scEvent: SC_Event): Promise<void> {
        switch (this.state) {
            case "idle":
                // IDLE PHASE.
                switch (this.getMode()) {
                    case "early-execution":
                    case "early-and-late-execution":{
                        // Execute immediately.
                        await this.execute(scEvent);
                        break;
                    }
                    case "late-execution":{
                        // Begin a cooldown phase and execute after it.
                        debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " is delayed.");
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
                if ("cooldown" === this.state && this.configuration.prolongCooldown) {
                    // Prolong cooldown duration.
                    this.prolongCooldownTimeout();
                }
                switch (this.getMode()) {
                    case "early-execution": {
                        // Nothing to do - just discard this execution.
                        debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " execution is discarded.");
                        break;
                    }
                    case "late-execution": {
                        // Wait until previous execution is over, then start another cooldown phase + execution.
                        debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " execution is postponed and may be merged to a later one.");
                        this.subsequent = { // Override `subsequent` if it contained an earlier waiter. After the cooldown is over, always execute the newest thing.
                            scEvent: scEvent,
                        };
                        break;
                    }
                    case "early-and-late-execution": {
                        // Wait until previous execution is over and a cooldown phase is passed, too.
                        debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " execution is postponed and may be merged to a later one.");
                        this.subsequent = { // Override `subsequent` if it contained an earlier waiter. After the cooldown is over, always execute the newest thing.
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
        debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " will be executed now.");
        const executor = new ShellCommandExecutor(this.plugin, this.tShellCommand, scEvent);
        await executor.doPreactionsAndExecuteShellCommand();
        await this.afterExecuting();
    }
    
    private async afterExecuting(): Promise<void> {
        debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " execution ended.");
        switch (this.getMode()) {
            case "early-execution": {
                // Not much to do anymore, go to cooldown and clear state after it.
                await this.cooldown();
                break;
            }
            case "late-execution": {
                if (this.subsequent) {
                    // Another event triggering happened during execution. Start another cooldown + execution process.
                    await this.cooldown();
                } else {
                    // No events triggered during execution. Clear state.
                    this.state = "idle";
                }
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
            debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " is in cooldown phase now.");
            this.cooldownTimeout = this.createCooldownTimeout(
                () => {this.afterCooldown().then(resolve);},
                true,
            );
        });
    }
    
    private async afterCooldown(): Promise<void> {
        const debugMessageBase = "Debouncing control: Shell command id " + this.tShellCommand.getId() + " \"cooldown\" phase ended, ";
        this.cooldownTimeout = null;
        switch (this.getMode()) {
            case "early-execution": {
                // Not much to do after cooldown.
                debugLog(debugMessageBase + "debouncing ended.");
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
    
    private createCooldownTimeout(callback: () => void, returnObject: true): CooldownTimeout
    private createCooldownTimeout(callback: () => void, returnObject: false): number
    private createCooldownTimeout(callback: () => void, returnObject: boolean): CooldownTimeout | number {
        const timeoutId: number = window.setTimeout(
            callback,
            this.getCoolDownMilliseconds(),
        );
        if (returnObject) {
            return {
                timeoutId: timeoutId,
                callback: callback,
            };
        } else {
            return timeoutId;
        }
    }
    
    private prolongCooldownTimeout(): void {
        if (this.cooldownTimeout) {
            // Delete and recreate the timeout.
            debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " \"cooldown\" phase will be prolonged.");
            window.clearTimeout(this.cooldownTimeout.timeoutId);
            this.cooldownTimeout.timeoutId = this.createCooldownTimeout(this.cooldownTimeout.callback, false);
        } else {
            // Can't find a timeout that should be prolonged.
            debugLog("Debouncing control: Shell command id " + this.tShellCommand.getId() + " \"cooldown\" phase tried to be prolonged, but no timeout function exists. Might be a bug.");
        }
    }
    
    /**
     * Translates this.configuration.executeEarly and this.configuration.executeLate to an earlier mode format that this
     * class still uses.
     * @private
     */
    private getMode(): "early-and-late-execution" | "early-execution" | "late-execution" {
        if (this.configuration.executeEarly && this.configuration.executeLate) {
            return "early-and-late-execution";
        } else if (this.configuration.executeEarly) {
            return "early-execution";
        } else if (this.configuration.executeLate) {
            return "late-execution";
        } else {
            // Debouncing is disabled.
            throw new Error("Debouncer.getMode(): Debouncing is disabled, but it was tried to be ued.");
        }
    }
    
    private getCoolDownMilliseconds(): number {
        return this.configuration.cooldown * 1000;
    }
    
    public static getDefaultConfiguration(executeEarly: boolean, executeLate: boolean): DebounceConfiguration {
        return {
            executeEarly: executeEarly,
            executeLate: executeLate,
            cooldown: 0,
            prolongCooldown: false,
        };
    }
}

type DebounceState = "idle" | "executing" | "cooldown";

export interface DebounceConfiguration {
    executeEarly: boolean,
    executeLate: boolean,
    cooldown: number,
    prolongCooldown: boolean,
}

interface CooldownTimeout {
    timeoutId: number,
    callback: () => void,
}