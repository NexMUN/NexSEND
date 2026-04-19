import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminSetupDto } from './dto/admin-setup.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminSessionGuard } from './admin-session.guard';
import { extractCookie } from './cookie.utils';

interface RequestWithAdmin extends Request {
  adminUser?: {
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: Date | null;
  };
}

@ApiTags('admin-auth')
@Controller('internal/v1/admin')
@UseGuards(ThrottlerGuard)
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('setup-status')
  @ApiOperation({ summary: 'Check if bootstrap admin is configured' })
  async setupStatus() {
    const setupComplete = await this.adminAuthService.isSetupComplete();
    return { setupComplete };
  }

  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create bootstrap admin (one-time)' })
  async setup(
    @Body() body: AdminSetupDto,
    @Headers('x-admin-setup-token') setupToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.validateSetupToken(setupToken);
    await this.adminAuthService.setupAdmin(body.email, body.password);
    const token = await this.adminAuthService.login(body.email, body.password);

    const cookieName = this.adminAuthService.getCookieName();
    response.cookie(cookieName, token, this.adminAuthService.getCookieOptions());

    return { success: true };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  async login(@Body() body: AdminLoginDto, @Res({ passthrough: true }) response: Response) {
    const token = await this.adminAuthService.login(body.email, body.password);

    const cookieName = this.adminAuthService.getCookieName();
    response.cookie(cookieName, token, this.adminAuthService.getCookieOptions());

    return { success: true };
  }

  @Post('logout')
  @UseGuards(AdminSessionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin logout' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookieName = this.adminAuthService.getCookieName();
    const rawCookie = request.headers.cookie || '';
    const token = extractCookie(rawCookie, cookieName);

    if (token) {
      await this.adminAuthService.logout(token);
    }

    response.clearCookie(cookieName, {
      path: '/',
      sameSite: 'lax',
    });

    return { success: true };
  }

  @Get('session')
  @UseGuards(AdminSessionGuard)
  @ApiResponse({ status: 200, description: 'Current admin session' })
  session(@Req() request: RequestWithAdmin) {
    return {
      authenticated: true,
      admin: request.adminUser,
    };
  }

  private validateSetupToken(token: string | undefined): void {
    const expectedToken = this.configService.get<string>('ADMIN_SETUP_TOKEN', '').trim();
    const isProd = this.configService.get<string>('NODE_ENV', 'development') === 'production';

    if (!expectedToken) {
      if (isProd) {
        throw new ForbiddenException('Admin setup token is not configured');
      }
      return;
    }

    if (!token || token !== expectedToken) {
      throw new ForbiddenException('Invalid admin setup token');
    }
  }
}
