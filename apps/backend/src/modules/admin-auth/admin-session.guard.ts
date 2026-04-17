import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { extractCookie } from './cookie.utils';

interface RequestWithAdmin extends Request {
  adminUser?: {
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: Date | null;
  };
}

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const cookieName = this.adminAuthService.getCookieName();
    const rawCookie = request.headers.cookie || '';
    const token = extractCookie(rawCookie, cookieName);

    if (!token) {
      throw new UnauthorizedException('Admin session missing');
    }

    this.enforceCsrfOriginPolicy(request);

    const adminUser = await this.adminAuthService.validateSession(token);
    request.adminUser = adminUser;
    return true;
  }

  private enforceCsrfOriginPolicy(request: Request): void {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method.toUpperCase())) {
      return;
    }

    const configuredOrigins = this.getAllowedOrigins();
    if (configuredOrigins.length === 0) {
      const isProd = this.configService.get<string>('NODE_ENV', 'development') === 'production';
      if (isProd) {
        throw new ForbiddenException('Admin origin allowlist not configured');
      }
      return;
    }

    const originHeader = this.getRequestOrigin(request);
    if (!originHeader) {
      throw new ForbiddenException('CSRF origin missing');
    }

    if (!configuredOrigins.includes(originHeader)) {
      throw new ForbiddenException('CSRF origin check failed');
    }
  }

  private getAllowedOrigins(): string[] {
    const configured = this.configService.get<string>('ADMIN_ALLOWED_ORIGINS', '');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', '');

    return [configured, frontendUrl]
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);
  }

  private getRequestOrigin(request: Request): string | null {
    const origin = request.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
      return origin;
    }

    const referer = request.headers.referer;
    if (typeof referer === 'string' && referer.length > 0) {
      try {
        const parsed = new URL(referer);
        return parsed.origin;
      } catch {
        return null;
      }
    }

    return null;
  }
}
