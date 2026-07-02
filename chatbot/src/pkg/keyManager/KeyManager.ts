export class KeyManager {
    private keys: string[] = []
    private counter: number = 0

    constructor(keyString?: string) {
        if (keyString) {
            this.setKeys(keyString)
        }
    }

    setKeys(keyString: string): void {
        const rawKeys = keyString.split(',')
        const keys: string[] = []

        for (const key of rawKeys) {
            const trimmed = key.trim()
            if (trimmed) {
                keys.push(trimmed)
            }
        }

        this.keys = keys
        this.counter = 0 // Reset counter when keys change
    }

    getNextKey(): string {
        if (this.keys.length === 0) {
            return ''
        }

        const key = this.keys[this.counter % this.keys.length]
        this.counter++
        return key
    }

    getKeyCount(): number {
        return this.keys.length
    }

    hasKeys(): boolean {
        return this.keys.length > 0
    }

    getAllKeys(): string[] {
        return [...this.keys]
    }
}
