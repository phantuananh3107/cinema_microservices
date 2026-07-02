export interface QuestionRequest {
    question: string
}

export interface QuestionResponse {
    question: string
    answer: string
    cached: boolean
}

export interface SimilarDocument {
    content: string
    similarity: number
}

export interface QuestionContext {
    question: string
    question_hash: string
    question_embedding: number[]
    similar_documents: SimilarDocument[]
    generated_answer: string
}
