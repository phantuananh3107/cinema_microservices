import fs from 'fs/promises'
import path from 'path'
import pdfParse from 'pdf-parse'

export class TextExtractor {
    async extractText(filePath: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase()

        switch (ext) {
            case '.txt':
                return this.extractFromTXT(filePath)
            case '.pdf':
                return this.extractFromPDF(filePath)
            case '.md':
                return this.extractFromMarkdown(filePath)
            default:
                throw new Error(`Unsupported file type: ${ext}`)
        }
    }

    private async extractFromTXT(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf-8')
        return content
    }

    private async extractFromMarkdown(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf-8')
        return this.cleanMarkdown(content)
    }

    private async extractFromPDF(filePath: string): Promise<string> {
        try {
            const dataBuffer = await fs.readFile(filePath)
            const data = await pdfParse(dataBuffer)
            return data.text
        } catch (error) {
            throw new Error(
                `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }
    }

    private cleanMarkdown(text: string): string {
        const lines = text.split('\n')
        const cleanedLines: string[] = []

        for (let line of lines) {
            line = line.trim()

            if (!line) {
                cleanedLines.push('')
                continue
            }

            if (line.startsWith('#')) {
                line = line.replace(/^#+\s*/, '').trim()
            }

            while (line.includes('[') && line.includes('](')) {
                const start = line.indexOf('[')
                const middle = line.indexOf('](', start)
                if (middle === -1) break

                const end = line.indexOf(')', middle)
                if (end === -1) break

                const linkText = line.substring(start + 1, middle)
                line = line.substring(0, start) + linkText + line.substring(end + 1)
            }

            line = line.replace(/\*\*/g, '')
            line = line.replace(/\*/g, '')
            line = line.replace(/__/g, '')
            line = line.replace(/_/g, '')

            if (line.startsWith('```')) {
                continue
            }

            line = line.replace(/`/g, '')

            cleanedLines.push(line)
        }

        return cleanedLines.join('\n')
    }

    async validateFile(filePath: string): Promise<void> {
        try {
            const stats = await fs.stat(filePath)

            const maxSize = 10 * 1024 * 1024
            if (stats.size > maxSize) {
                throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`)
            }

            const ext = path.extname(filePath).toLowerCase()
            const allowedExts = ['.txt', '.pdf', '.md']

            if (!allowedExts.includes(ext)) {
                throw new Error(
                    `Unsupported file extension: ${ext} (allowed: ${allowedExts.join(', ')})`,
                )
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`File does not exist: ${filePath}`)
            }
            throw error
        }
    }

    async getFileInfo(filePath: string): Promise<Record<string, any>> {
        const stats = await fs.stat(filePath)
        const ext = path.extname(filePath).toLowerCase()

        let lineCount = 0
        if (ext === '.txt') {
            try {
                const content = await fs.readFile(filePath, 'utf-8')
                lineCount = content.split('\n').length
            } catch (error) {
            }
        }

        return {
            name: path.basename(filePath),
            size: stats.size,
            modified: stats.mtime,
            extension: ext,
            lineCount,
        }
    }
}
