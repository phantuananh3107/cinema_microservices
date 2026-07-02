import { Request, Response, NextFunction } from 'express'

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.sendStatus(204)
        return
    }

    next()
}
