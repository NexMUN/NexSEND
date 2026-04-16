import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminSessionGuard } from './admin-session.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminAuthService, AdminSessionGuard],
  controllers: [AdminAuthController],
  exports: [AdminAuthService, AdminSessionGuard],
})
export class AdminAuthModule {}
