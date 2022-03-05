export class IDGenerator {
    constructor(
        private current_ids: string[] = [],
        private readonly min_length = 5,
        private readonly characters = "abcdefghijklmnopqrstuvwxyz0123456789",
    ) {}

    public setCurrentIDs(ids: string[]) {
        this.current_ids = ids;
    }

    public addCurrentID(id: string) {
        this.current_ids.push(id);
    }

    public generateID(): string {
        let generated_id: string = "";
        while (generated_id.length < this.min_length || this.isIDReserved(generated_id)) {
            generated_id += this.generateCharacter();
        }
        this.current_ids.push(generated_id);
        return generated_id;
    }

    private generateCharacter(): string {
        return this.characters.charAt(
            Math.floor(Math.random() * this.characters.length)
        );
    }

    private isIDReserved(id: string): boolean {
        return this.current_ids.contains(id);
    }
}