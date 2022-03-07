import {
    Model
} from "../imports";

export abstract class Instance {

    public setting_fields_container: HTMLElement;

    public constructor(
        public readonly model: Model,
        public readonly configuration: InstanceConfiguration,
        public readonly parent_configuration: InstanceConfiguration,
    ) {}

    public abstract getTitle(): string;

}

export interface InstanceConfiguration {
    [key: string]: any;
}