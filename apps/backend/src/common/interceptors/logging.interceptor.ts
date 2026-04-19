import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly redactedFields = new Set([
    'password',
    'passwordHash',
    'token',
    'tokenHash',
    'apiKey',
    'authorization',
    'cookie',
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    const safeBody = this.sanitizeForLog(request.body);
    this.logger.log(`Incoming Request: ${method} ${url} - Body: ${JSON.stringify(safeBody)}`);

    return next
      .handle()
      .pipe(
        tap(() => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `Outgoing Response: ${method} ${url} - Status: ${response.statusCode} - ${responseTime}ms`,
          );
        }),
      );
  }

  private sanitizeForLog(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeForLog(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const safeObject: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(value)) {
      if (this.redactedFields.has(key)) {
        safeObject[key] = '[REDACTED]';
        continue;
      }

      safeObject[key] = this.sanitizeForLog(fieldValue);
    }

    return safeObject;
  }
}
