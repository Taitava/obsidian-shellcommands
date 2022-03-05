import {
    Model
} from "../imports";

export class Instance {
    public constructor(
        // protected readonly plugin: SC_Plugin,
        protected readonly model: Model,
        public readonly configuration: InstanceConfiguration,
        public readonly parent_configuration: InstanceConfiguration,
    ) {}
}

export interface InstanceConfiguration {
    [key: string]: any;
}