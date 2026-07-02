import { Request, Response } from 'express'
import { ChatService } from '../services/index.js'
import { logger } from '../utils/index.js'
import crypto from 'crypto'

interface ConversationMessage {
    message: string
    conversation_id?: string | null
}

export class ChatHandler {
    private chatService: ChatService

    constructor({ chatService }: { chatService: ChatService }) {
        this.chatService = chatService
    }

    sendMessage = async (req: Request, res: Response): Promise<void> => {
        try {
            const { message, conversation_id } = req.body as ConversationMessage

            if (!message || !message.trim()) {
                res.status(400).json({
                    success: false,
                    message: 'Tin nhắn không được để trống',
                })
                return
            }

            const conversationId = conversation_id || crypto.randomBytes(16).toString('hex')

            const response = await this.chatService.processQuestion(message.trim())

            res.status(200).json({
                success: true,
                data: {
                    response: response.answer,
                    message: response.answer,
                    conversation_id: conversationId,
                    cached: response.cached,
                },
            })
        } catch (error) {
            logger.error('Error sending message', { error })
            res.status(500).json({
                success: false,
                message: `Có lỗi xảy ra: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })
        }
    }
}
