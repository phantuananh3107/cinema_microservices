import { GoogleGenAI } from '@google/genai'
import { KeyManager } from '../pkg/keyManager/index.js'
import { retryWithApiKey } from '../utils/index.js'

export class EmbeddingService {
    private keyManager: KeyManager

    constructor({ keyManager }: { keyManager: KeyManager }) {
        this.keyManager = keyManager
    }

    async embeddingText(text: string): Promise<number[]> {
        return retryWithApiKey(this.keyManager, async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey })

            const response = await ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: text,
            })

            if (!response.embeddings || response.embeddings.length === 0) {
                return []
            }

            const values = response.embeddings[0].values
            if (!values || values.length === 0) {
                return []
            }

            return values
        })
    }
}
