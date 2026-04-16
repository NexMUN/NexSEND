import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailProcessor } from './processors/email.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailProviderFactory } from './factories/email-provider.factory';
import { SESProvider } from './providers/ses.provider';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    PrismaModule,
  ],
  controllers: [EmailController],
  providers: [
    EmailService, 
    EmailProcessor,
    EmailProviderFactory,
    SESProvider,
  ],
  exports: [EmailService],
})
export class EmailModule {}
