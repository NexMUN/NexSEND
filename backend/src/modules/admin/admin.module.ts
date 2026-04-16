import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { OrganizationModule } from '../organization/organization.module';
import { ServiceKeyModule } from '../service-key/service-key.module';
import { DomainModule } from '../domain/domain.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [AdminAuthModule, OrganizationModule, ServiceKeyModule, DomainModule, PrismaModule],
  controllers: [AdminController],
})
export class AdminModule {}
