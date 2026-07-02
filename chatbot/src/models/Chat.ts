export interface Chat {
    id: string
    question: string
    answer: string
    created_at?: Date
}

export const CHAT_TABLE = 'chats'
