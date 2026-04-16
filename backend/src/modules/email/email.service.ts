import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SendEmailDto, SendBulkEmailDto } from './dto/send-email.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailStatus, EmailPriority as PrismaEmailPriority } from '@prisma/client';
import { EmailJobData } from './interfaces/email-config.interface';
import { EmailProviderFactory } from './factories/email-provider.factory';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue('email') private emailQueue: Queue,
    private readonly emailProviderFactory: EmailProviderFactory,
  ) {}

  async sendEmail(organizationId: string, emailData: SendEmailDto, serviceKey: any) {
    if (!serviceKey) {
      throw new Error('No active service key found for organization');
    }

    // Get organization by orgId, fallback to default if not found
    let organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });
    
    // If organization not found, create/use fallback organization for nexmun.in
    if (!organization) {
      this.logger.warn(`Organization ${organizationId} not found, using fallback domain nexmun.in`);
      
      // Try to find existing fallback organization or create one
      organization = await this.prisma.organization.findFirst({
        where: { name: 'NexMUN Fallback' },
      });
      
      if (!organization) {
        const fallbackEmail = emailData.from ? `${emailData.from}@nexmun.in` : 'no-reply@nexmun.in';
        organization = await this.prisma.organization.create({
          data: {
            organizationId: 'fallback-nexmun',
            name: 'NexMUN Fallback',
            email: fallbackEmail,
            status: 'ACTIVE',
          },
        });
        
        // Create the nexmun.in domain for the fallback organization
        await this.prisma.domain.create({
          data: {
            organizationId: organization.id,
            domain: 'nexmun.in',
            isVerified: true,
            status: 'VERIFIED',
            verificationToken: `fallback-${Date.now()}`,
          },
        }).catch(() => {
          // Domain might already exist, ignore error
        });
      }
    }

    // Create email job in database
    const emailJob = await this.prisma.emailJob.create({
      data: {
        organizationId: organization.id,
        serviceKeyId: serviceKey.id,
        fromEmail: 'temp@nexmun.in', // Will be constructed dynamically in sendDirectEmail
        fromName: emailData.fromName || null,
        toEmails: [emailData.to],
        ccEmails: emailData.cc || [],
        bccEmails: emailData.bcc || [],
        variables: emailData.templateData || {},
        priority: this.mapPriority(emailData.priority),
        status: EmailStatus.QUEUED,
        metadata: {
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          attachments: emailData.attachments || [],
          headers: emailData.headers || {},
          replyTo: emailData.replyTo || null,
          tags: emailData.tags || [],
          // Merge custom metadata at top level (includes isSystemEmail)
          ...(emailData.metadata || {}),
        } as any,
      },
    });

    // Add job to queue
    const jobData: EmailJobData = {
      id: emailJob.id,
      organizationId: organization.id,
      to: emailData.to,
      from: emailData.from,
      fromName: emailData.fromName,
      replyTo: emailData.replyTo,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      cc: emailData.cc,
      bcc: emailData.bcc,
      attachments: emailData.attachments,
      headers: emailData.headers,
      priority: emailData.priority,
    };

    this.logger.log(`Adding email job to queue: ${emailJob.id} for ${emailData.to}`);

    await this.emailQueue.add('send-email', jobData, {
      priority: this.getPriorityValue(emailData.priority),
      attempts: 3,
      backoff: 5000, // 5 second delay between retries
    });

    this.logger.log(`✅ Email job queued successfully: ${emailJob.id} | To: ${emailData.to} | Subject: "${emailData.subject}"`);

    return {
      id: emailJob.id,
      status: emailJob.status,
      to: (emailJob.toEmails as string[])[0],
      subject: (emailJob.metadata as any)?.subject || '',
      createdAt: emailJob.createdAt,
    };
  }

  async sendBulkEmails(organizationId: string, bulkData: SendBulkEmailDto, serviceKey: any) {
    // Get organization by orgId
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    const results = await Promise.allSettled(
      bulkData.emails.map(email => this.sendEmail(organizationId, email, serviceKey)),
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: bulkData.emails.length,
      successful,
      failed,
      jobs: results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value),
    };
  }

  async sendDirectEmail(emailData: EmailJobData): Promise<void> {
    this.logger.log(`📧 Processing email job: ${emailData.id}`);
    this.logger.log(`   To: ${emailData.to}`);
    this.logger.log(`   Subject: "${emailData.subject}"`);
    this.logger.log(`   From (input): ${emailData.from || 'default'}`);
    this.logger.log(`   FromName (input): ${emailData.fromName || 'none'}`);

    try {
      let info: any;

      // Construct the from email based on organization's primary domain
      const fromEmail = await this.constructFromEmail(emailData.organizationId, emailData.from, emailData.fromName);
      this.logger.log(`   From (constructed): ${fromEmail}`);
      
      const provider = await this.emailProviderFactory.getPrimaryProvider();
      this.logger.log(`   Provider: ${provider.providerName}`);
      this.logger.log(`📤 Sending email via ${provider.providerName}...`);

      const result = await provider.sendEmail({
        from: fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        cc: emailData.cc,
        bcc: emailData.bcc,
        replyTo: emailData.replyTo,
        headers: emailData.headers,
      });

      info = {
        messageId: result.messageId,
        response: result.response,
      };

      this.logger.log(`✅ Email sent successfully via ${provider.providerName}`);
      this.logger.log(`   Message ID: ${result.messageId}`);
      
      // Update job status with real fromEmail
      await this.prisma.emailJob.update({
        where: { id: emailData.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          messageId: info.messageId,
          fromEmail: fromEmail, // Update with constructed email
        },
      });

      // Create email event
      await this.prisma.emailEvent.create({
        data: {
          emailJobId: emailData.id,
          eventType: 'SENT',
          details: {
            messageId: info.messageId,
            response: info.response,
          },
        },
      });

      this.logger.log(`✅ Email job ${emailData.id} completed successfully - MessageID: ${info.messageId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      this.logger.error(`❌ Failed to send email job: ${emailData.id}`);
      this.logger.error(`   To: ${emailData.to}`);
      this.logger.error(`   Subject: "${emailData.subject}"`);
      this.logger.error(`   Error: ${errorMessage}`);
      if (errorStack) {
        this.logger.error(`   Stack: ${errorStack}`);
      }

      // Update job status
      await this.prisma.emailJob.update({
        where: { id: emailData.id },
        data: {
          status: EmailStatus.FAILED,
          attempts: { increment: 1 },
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Create email event
      await this.prisma.emailEvent.create({
        data: {
          emailJobId: emailData.id,
          eventType: 'FAILED',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });

      throw error;
    }
  }

  async getEmailJob(organizationId: string, jobId: string) {
    // Get organization by orgId
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    const job = await this.prisma.emailJob.findFirst({
      where: {
        id: jobId,
        organizationId: organization.id,
      },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!job) {
      throw new Error('Email job not found');
    }

    return job;
  }

  async getEmailJobs(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    status?: EmailStatus,
    includeSystemEmails: boolean = false,
  ) {
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`📋 Getting email jobs`);
    this.logger.log(`   External organizationId: ${organizationId}`);
    this.logger.log(`   Page: ${page}, Limit: ${limit}`);
    this.logger.log(`   Status filter: ${status || 'none'}`);
    this.logger.log(`   Include system emails: ${includeSystemEmails}`);

    const skip = (page - 1) * limit;

    // Look up organization by external organizationId
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });

    if (!organization) {
      this.logger.error(`❌ Organization not found for external ID: ${organizationId}`);
      throw new Error('Organization not found');
    }

    this.logger.log(`   ✓ Found organization: ${organization.name} (internal ID: ${organization.id})`);

    // Build where clause - use internal organization.id
    const where: any = {
      organizationId: organization.id,
      ...(status && { status }),
    };

    this.logger.log(`   Query where clause: ${JSON.stringify(where)}`);

    // Fetch all jobs matching basic criteria
    const [allJobs, totalCount] = await Promise.all([
      this.prisma.emailJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailJob.count({ where }),
    ]);

    this.logger.log(`   📦 Fetched ${allJobs.length} jobs from database (total count: ${totalCount})`);

    // Filter system emails if not included
    const filteredJobs = includeSystemEmails
      ? allJobs
      : allJobs.filter(job => {
          const metadata = job.metadata as any;
          return !metadata?.isSystemEmail;
        });

    this.logger.log(`   🔍 After filtering: ${filteredJobs.length} jobs (includeSystemEmails: ${includeSystemEmails})`);

    // Apply pagination to filtered results
    const total = filteredJobs.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedJobs = filteredJobs.slice(skip, skip + limit);

    this.logger.log(`   📄 Returning ${paginatedJobs.length} jobs (page ${page}/${totalPages})`);
    this.logger.log(`${'='.repeat(80)}\n`);

    return {
      data: paginatedJobs.map(job => ({
        id: job.id,
        organizationId: job.organizationId,
        to: (job.toEmails as string[])[0],
        subject: (job.metadata as any)?.subject || '',
        status: job.status,
        attempts: job.attempts,
        lastError: job.failureReason,
        sentAt: job.sentAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async retryEmailJob(organizationId: string, jobId: string) {
    // Get organization by orgId
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });
    
    if (!organization) {
      throw new Error('Organization not found');
    }
    const job = await this.prisma.emailJob.findFirst({
      where: {
        id: jobId,
        organizationId: organization.id,
      },
    });

    if (!job) {
      throw new Error('Email job not found');
    }

    // Check if job is in retryable state (FAILED or BOUNCED)
    if (job.status !== EmailStatus.FAILED && job.status !== EmailStatus.BOUNCED) {
      throw new Error(`Cannot retry email job with status '${job.status}'. Only FAILED or BOUNCED jobs can be retried.`);
    }

    // Reset job status
    await this.prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status: EmailStatus.QUEUED,
        failureReason: null,
      },
    });

    // Re-queue the job
    const jobData: EmailJobData = {
      id: job.id,
      organizationId: job.organizationId,
      to: (job.toEmails as string[])[0],
      from: job.fromEmail || undefined,
      subject: (job.metadata as any)?.subject || '',
      html: (job.metadata as any)?.html || '',
      ...(job.metadata as any),
    };

    await this.emailQueue.add('send-email', jobData, {
      priority: this.getPriorityValue(jobData.priority),
      attempts: 3,
      backoff: 5000, // 5 second delay between retries
    });

    return {
      id: job.id,
      status: EmailStatus.QUEUED,
      message: 'Email job queued for retry',
    };
  }

  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'HIGH':
        return 1;
      case 'NORMAL':
        return 5;
      case 'LOW':
        return 10;
      default:
        return 5;
    }
  }

  private mapPriority(priority?: string): PrismaEmailPriority {
    switch (priority) {
      case 'HIGH':
        return PrismaEmailPriority.HIGH;
      case 'LOW':
        return PrismaEmailPriority.LOW;
      default:
        return PrismaEmailPriority.NORMAL;
    }
  }

  /**
   * Constructs the from email address using organization's primary domain
   * Format: "Display Name <fromName@primaryDomain>" or fallback to nexmun.in
   */
  private async constructFromEmail(organizationId: string, from?: string, fromName?: string): Promise<string> {
    const fallbackDomain = this.configService.get<string>('FALLBACK_DOMAIN', 'nexmun.in');
    const defaultFrom = 'no-reply';

    this.logger.log(`🔧 Constructing from email...`);
    this.logger.log(`   Input from: "${from || 'undefined'}"`);
    this.logger.log(`   Input fromName: "${fromName || 'undefined'}"`);

    // Treat empty string as not passed (normalize to undefined)
    const normalizedFromName = fromName && fromName.trim() !== '' ? fromName.trim() : undefined;

    // Trim and extract email prefix from full email if needed
    let emailPrefix = from ? from.trim() : defaultFrom;

    // If 'from' contains @, extract only the prefix part (before @)
    if (emailPrefix.includes('@')) {
      const originalEmail = emailPrefix;
      emailPrefix = emailPrefix.split('@')[0].trim();
      this.logger.log(`   Extracted prefix from full email: "${originalEmail}" → "${emailPrefix}"`);
    }

    // Use extracted prefix
    const emailName = emailPrefix;
    this.logger.log(`   Using email prefix: "${emailName}"`);
    
    try {
      // The organizationId parameter could be either:
      // 1. The organizationId field (e.g., "6bee8878-1877-49ae-a37f-877fc7b26127")
      // 2. The internal id field (e.g., "996e8822-cd1a-4e58-8ba0-5e1f0d08ec29")
      // Try both approaches
      this.logger.log(`DEBUG: Trying to find org by organizationId field: ${organizationId}`);
      let organization = await this.prisma.organization.findUnique({
        where: { organizationId },
      });

      if (!organization) {
        this.logger.log(`DEBUG: Not found by organizationId field, trying by internal id: ${organizationId}`);
        // If not found by organizationId field, try by internal id
        organization = await this.prisma.organization.findUnique({
          where: { id: organizationId },
        });
        
        if (organization) {
          this.logger.log(`DEBUG: Found organization by internal id: ${organization.organizationId}`);
        }
      } else {
        this.logger.log(`DEBUG: Found organization by organizationId field: ${organization.id}`);
      }

      if (!organization) {
        this.logger.warn(`Organization ${organizationId} not found for constructFromEmail`);
        const emailAddress = `${emailName}@${fallbackDomain}`;
        return normalizedFromName ? `${normalizedFromName} <${emailAddress}>` : emailAddress;
      }

      // Get organization's primary domain using the internal organization ID
      const primaryDomain = await this.prisma.domain.findFirst({
        where: {
          organizationId: organization.id, // Use internal organization ID
          isPrimary: true,
          isVerified: true,
        },
      });

      if (primaryDomain) {
        this.logger.log(`   Found primary domain: ${primaryDomain.domain}`);
      } else {
        this.logger.log(`   No primary domain found, using fallback: ${fallbackDomain}`);
      }

      const domain = primaryDomain?.domain || fallbackDomain;
      const emailAddress = `${emailName}@${domain}`;

      this.logger.log(`   Final email address: ${emailAddress}`);

      // Use provided fromName, or default to organization name
      const displayName = normalizedFromName || organization.name;
      this.logger.log(`   Display name: "${displayName}"`);

      return `${displayName} <${emailAddress}>`;
    } catch (error) {
      this.logger.warn(`Failed to get primary domain for org ${organizationId}, using fallback`);
      const emailAddress = `${emailName}@${fallbackDomain}`;

      // Use normalized fromName or just email address if no name provided
      return normalizedFromName ? `${normalizedFromName} <${emailAddress}>` : emailAddress;
    }
  }
}
