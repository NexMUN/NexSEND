import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../constants';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    errorCode: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    super(
      {
        success: false,
        error: {
          code: errorCode,
          message,
          details,
        },
      },
      statusCode,
    );
  }
}

export class ServiceKeyNotFoundException extends BusinessException {
  constructor(message = 'Service key not found') {
    super(message, ERROR_CODES.INVALID_SERVICE_KEY, HttpStatus.UNAUTHORIZED);
  }
}

export class ServiceKeyExpiredException extends BusinessException {
  constructor(message = 'Service key has expired') {
    super(message, ERROR_CODES.SERVICE_KEY_EXPIRED, HttpStatus.UNAUTHORIZED);
  }
}

export class ServiceKeyInactiveException extends BusinessException {
  constructor(message = 'Service key is inactive') {
    super(message, ERROR_CODES.SERVICE_KEY_INACTIVE, HttpStatus.UNAUTHORIZED);
  }
}

export class RateLimitExceededException extends BusinessException {
  constructor(message = 'Rate limit exceeded') {
    super(message, ERROR_CODES.RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class OrganizationNotFoundException extends BusinessException {
  constructor(message = 'Organization not found') {
    super(message, ERROR_CODES.ORGANIZATION_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}

export class OrganizationSuspendedException extends BusinessException {
  constructor(message = 'Organization is suspended') {
    super(message, ERROR_CODES.ORGANIZATION_SUSPENDED, HttpStatus.FORBIDDEN);
  }
}

export class ValidationException extends BusinessException {
  constructor(message = 'Validation failed', details?: any) {
    super(message, ERROR_CODES.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, details);
  }
}