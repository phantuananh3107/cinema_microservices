import { NextFunction, Request, Response } from 'express';
import { HttpStatus, IApiResponse, IApiError } from '../types/index.js';

export const errorHandler = (
  err: IApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
  
  const response: IApiResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    status: status
  };

  res.status(status).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: IApiResponse = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
    status: HttpStatus.NOT_FOUND
  };

  res.status(HttpStatus.NOT_FOUND).json(response);
};
