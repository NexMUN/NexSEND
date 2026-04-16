import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/response.dto';
import { ERROR_CODES } from '../constants';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ApiResponseDto;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && 'error' in exceptionResponse) {
        errorResponse = exceptionResponse as ApiResponseDto;
      } else {
        errorResponse = {
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_FAILED,
            message: exception.message,
            details: exceptionResponse,
          },
        };
      }
    } else if (exception instanceof Error) {
      errorResponse = {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? exception.message : undefined,
        },
      };

      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        {
          path: request.url,
          method: request.method,
          body: request.body,
        },
      );
    } else {
      errorResponse = {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Unknown error occurred',
        },
      };
    }

    errorResponse.meta = {
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'] as string,
    };

    response.status(status).json(errorResponse);
  }
}