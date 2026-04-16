import { Module } from '@nestjs/common';
import { ServiceKeyService } from './service-key.service';
import { ServiceKeyController } from './service-key.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ServiceKeyController],
  providers: [ServiceKeyService],
  exports: [ServiceKeyService],
})
export class ServiceKeyModule {}