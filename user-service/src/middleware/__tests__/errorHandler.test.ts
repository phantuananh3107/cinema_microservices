import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../errorHandler';
import { HttpStatus } from '../../types';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      url: '/test',
      method: 'GET',
      originalUrl: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('errorHandler', () => {
    // TC-NODE-USER-016
    test('should handle 422 Invalid request', () => {
      const error = { status: 422, message: 'Invalid request', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid request',
        status: 422,
      });
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle 400 Bad Request', () => {
      const error = { status: 400, message: 'Bad parameters', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    });

    test('should handle 401 Unauthorized', () => {
      const error = { status: 401, message: 'Token expired', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    test('should handle 403 Forbidden', () => {
      const error = { status: 403, message: 'Access denied', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    test('should handle 404 Not Found explicitly', () => {
      const error = { status: 404, message: 'Resource not found', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    test('should handle 500 Internal error explicitly', () => {
      const error = { status: 500, message: 'Database failed', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    // TC-NODE-USER-018
    test('should use default status 500 when status is missing', () => {
      const error = { message: 'Something went wrong', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
    });

    test('should use default message when message is missing', () => {
      const error = { status: 400, name: 'Error' } as any;
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Internal Server Error'
      }));
    });

    test('should handle completely empty error object', () => {
      const error = {} as any;
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error',
        status: 500
      });
    });

    // TC-NODE-USER-019
    test('should log error details with stack trace', () => {
      const error = { status: 500, message: 'Crash', stack: 'stack info', name: 'Error' };
      errorHandler(error as any, mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(console.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Crash',
          stack: 'stack info',
          url: '/test',
          method: 'GET'
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    // TC-NODE-USER-017
    test('should handle standard 404', () => {
      mockRequest.originalUrl = '/api/v1/unknown';
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Route /api/v1/unknown not found',
        status: 404,
      });
    });

    test('should handle 404 for root path', () => {
      mockRequest.originalUrl = '/';
      notFoundHandler(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Route / not found'
      }));
    });

    test('should handle 404 for long nested paths', () => {
      mockRequest.originalUrl = '/a/b/c/d/e/f/g';
      notFoundHandler(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Route /a/b/c/d/e/f/g not found'
      }));
    });
  });
});
