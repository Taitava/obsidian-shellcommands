export abstract class Escaper {
    protected raw_value: string;

    public constructor(raw_value: string) {
        this.raw_value = raw_value;
    }

    public abstract escape(): string;
}