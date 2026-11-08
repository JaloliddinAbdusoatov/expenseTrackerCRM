import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let errorMessage: string;
    if (typeof message === 'string') {
      errorMessage = message;
    } else if (typeof message === 'object' && message !== null) {
      // Handle validation errors from class-validator
      if (Array.isArray((message as any).message)) {
        errorMessage = (message as any).message.join(', ');
      } else {
        errorMessage = (message as any).message || JSON.stringify(message);
      }
    } else {
      errorMessage = 'An error occurred';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
    };

    // Log error
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
        'HttpExceptionFilter',
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${JSON.stringify(errorResponse)}`,
      );
    }

    // In development, show detailed error messages
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (!isDevelopment && status >= 500) {
      errorResponse.message = 'Internal server error';
    } else if (isDevelopment && exception instanceof Error) {
      // In development, include error details
      errorResponse.message = exception.message || errorMessage;
    }

    response.status(status).json(errorResponse);
  }
}
