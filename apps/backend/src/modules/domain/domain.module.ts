import { Module } from '@nestjs/common';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { DnsLookupService } from './services/dns-lookup.service';
import { SESProvider } from '../email/providers/ses.provider';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DomainController],
  providers: [DomainService, DnsLookupService, SESProvider],
  exports: [DomainService],
})
export class DomainModule {}
