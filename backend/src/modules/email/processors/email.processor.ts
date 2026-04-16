import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../email.service';
import { EmailJobData } from '../interfaces/email-config.interface';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>) {
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`🔄 BullMQ Worker: Picked up email job ${job.id}`);
    this.logger.log(`   Job ID: ${job.id}`);
    this.logger.log(`   To: ${job.data.to}`);
    this.logger.log(`   Subject: "${job.data.subject}"`);
    this.logger.log(`   Attempt: ${job.attemptsMade + 1}`);
    this.logger.log(`${'='.repeat(80)}\n`);

    try {
      await this.emailService.sendDirectEmail(job.data);
      this.logger.log(`\n✅ BullMQ Worker: Email job ${job.id} completed successfully\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`\n❌ BullMQ Worker: Email job ${job.id} failed`);
      this.logger.error(`   Error: ${errorMessage}`);
      this.logger.error(`   Attempt: ${job.attemptsMade + 1}/3\n`);
      throw error; // Re-throw to trigger retry
    }
  }
}