import { Pool } from 'pg'
import { Chat, CHAT_TABLE } from '../models'
import { wrapDatabaseError } from '../utils/errorHandler'

export class ChatDatastore {
    constructor(private pool: Pool) {}

    async createChatRecord(chat: Chat): Promise<void> {
        const query = `
      INSERT INTO ${CHAT_TABLE} (id, question, answer, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        answer = EXCLUDED.answer
    `

        const values = [
            chat.id,
            chat.question,
            chat.answer,
            chat.created_at || new Date(),
        ]

        try {
            await this.pool.query(query, values)
        } catch (error) {
            throw wrapDatabaseError('Failed to insert chat record', error)
        }
    }
}
