import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const DEFAULT_SESSION_HOURS = 12;

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async isSetupComplete(): Promise<boolean> {
    const count = await this.prisma.adminUser.count();
    return count > 0;
  }

  async setupAdmin(email: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.adminUser.count();
          if (existing > 0) {
            throw new ConflictException('Admin setup already completed');
          }

          await tx.adminUser.create({
            data: {
              email: email.toLowerCase(),
              passwordHash,
              isActive: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      // Retry-safe behavior for concurrent bootstrap races under SERIALIZABLE isolation.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Admin setup already completed');
      }

      throw error;
    }
  }

  async login(email: string, password: string): Promise<string> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createSession(adminUser.id);
  }

  async validateSession(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash },
      include: { adminUser: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= now || !session.adminUser.isActive) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return {
      id: session.adminUser.id,
      email: session.adminUser.email,
      isActive: session.adminUser.isActive,
      lastLoginAt: session.adminUser.lastLoginAt,
    };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.adminSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  getCookieName(): string {
    return this.configService.get<string>('ADMIN_AUTH_COOKIE_NAME', 'admin_session');
  }

  getCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
  } {
    const isProd = this.configService.get<string>('NODE_ENV', 'development') === 'production';
    const hours = this.configService.get<number>('ADMIN_SESSION_TTL_HOURS', DEFAULT_SESSION_HOURS);

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: hours * 60 * 60 * 1000,
    };
  }

  private async createSession(adminUserId: string): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const hours = this.configService.get<number>('ADMIN_SESSION_TTL_HOURS', DEFAULT_SESSION_HOURS);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    await this.prisma.adminSession.create({
      data: {
        adminUserId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
