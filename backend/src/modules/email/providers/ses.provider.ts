import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  IEmailProvider, 
  EmailProvider, 
  EmailData, 
  EmailResponse, 
  DomainAuthData, 
  DomainResponse, 
  DomainVerificationResult 
} from '../interfaces/email-provider.interface';

// SES SDK imports (will need to install @aws-sdk/client-ses)
interface SESClient {
  send: (command: any) => Promise<any>;
}

interface SendEmailCommand {
  new (input: any): any;
}

interface VerifyDomainIdentityCommand {
  new (input: any): any;
}

interface GetIdentityVerificationAttributesCommand {
  new (input: any): any;
}

interface PutIdentityDkimAttributesCommand {
  new (input: any): any;
}

@Injectable()
export class SESProvider implements IEmailProvider {
  readonly providerName = EmailProvider.SES;
  private readonly logger = new Logger(SESProvider.name);
  private sesClient: SESClient | null = null;
  private SendEmailCommand: SendEmailCommand | null = null;
  private VerifyDomainIdentityCommand: VerifyDomainIdentityCommand | null = null;
  private GetIdentityVerificationAttributesCommand: GetIdentityVerificationAttributesCommand | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeSESClient();
  }

  private async initializeSESClient() {
    try {
      // Dynamic import of AWS SDK to avoid requiring it if not used
      const { SESClient } = await import('@aws-sdk/client-ses');
      const { 
        SendEmailCommand, 
        VerifyDomainIdentityCommand, 
        GetIdentityVerificationAttributesCommand 
      } = await import('@aws-sdk/client-ses');

      this.sesClient = new SESClient({
        region: this.configService.get<string>('AWS_REGION', 'eu-north-1'),
        credentials: {
          accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
          secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
          sessionToken: this.configService.get<string>('AWS_SESSION_TOKEN'),
        },
      });

      this.SendEmailCommand = SendEmailCommand;
      this.VerifyDomainIdentityCommand = VerifyDomainIdentityCommand;
      this.GetIdentityVerificationAttributesCommand = GetIdentityVerificationAttributesCommand;

      this.logger.log('AWS SES client initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to initialize AWS SES client. Install @aws-sdk/client-ses to use SES provider:', errorMessage);
      throw new Error('AWS SES SDK not available. Install @aws-sdk/client-ses package.');
    }
  }

  async sendEmail(emailData: EmailData): Promise<EmailResponse> {
    if (!this.sesClient || !this.SendEmailCommand) {
      throw new Error('SES client not initialized');
    }

    try {
      this.logger.log(`Sending email via Amazon SES to ${emailData.to}`);
      this.logger.log(`Using Source (from): ${emailData.from}`);

      // Parse the from field to handle display name format: "Display Name <email@domain.com>"
      let sourceField = emailData.from;
      let displayName: string | null = null;
      let emailAddress: string;

      // Extract display name and email if in format "Name <email>"
      const displayNameMatch = emailData.from.match(/^(.+?)\s*<(.+?)>$/);
      if (displayNameMatch) {
        displayName = displayNameMatch[1].trim();
        emailAddress = displayNameMatch[2].trim();
      } else {
        emailAddress = emailData.from.trim();
      }

      // Fix double domain issue if present
      const emailParts = emailAddress.split('@');
      if (emailParts.length > 2) {
        const username = emailParts[0];
        const lastDomain = emailParts[emailParts.length - 1];
        emailAddress = `${username}@${lastDomain}`;
        this.logger.log(`Fixed double domain: ${emailAddress}`);
      }

      // Reconstruct Source field with display name if present
      sourceField = displayName ? `${displayName} <${emailAddress}>` : emailAddress;
      this.logger.log(`Final SES Source field: ${sourceField}`);

      const command = new this.SendEmailCommand({
        Source: sourceField, // AWS SES supports "Display Name <email@domain.com>" format
        Destination: {
          ToAddresses: [emailData.to],
          ...(emailData.cc && emailData.cc.length > 0 ? { CcAddresses: emailData.cc } : {}),
          ...(emailData.bcc && emailData.bcc.length > 0 ? { BccAddresses: emailData.bcc } : {}),
        },
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: 'UTF-8',
          },
          Body: {
            ...(emailData.html ? {
              Html: {
                Data: emailData.html,
                Charset: 'UTF-8',
              },
            } : {}),
            ...(emailData.text ? {
              Text: {
                Data: emailData.text,
                Charset: 'UTF-8',
              },
            } : {}),
          },
        },
        ...(emailData.replyTo ? { ReplyToAddresses: [emailData.replyTo] } : {}),
        ...(emailData.headers ? { 
          Tags: Object.entries(emailData.headers).map(([Name, Value]) => ({ Name, Value })) 
        } : {}),
      });

      const result = await this.sesClient.send(command);
      
      this.logger.log(`Email sent successfully via Amazon SES - Message ID: ${result.MessageId}`);
      
      return {
        messageId: result.MessageId,
        response: `SES Success - ${result.MessageId}`,
        provider: this.providerName,
      };
    } catch (error) {
      this.logger.error('Amazon SES error:', error);
      throw error;
    }
  }

  async verifyCredentials(): Promise<boolean> {
    if (!this.sesClient) {
      return false;
    }

    try {
      // Try to get sending statistics as a credential verification
      const { GetSendStatisticsCommand } = await import('@aws-sdk/client-ses');
      const command = new GetSendStatisticsCommand({});
      await this.sesClient.send(command);
      return true;
    } catch (error) {
      this.logger.error('SES credentials verification failed:', error);
      return false;
    }
  }

  async createDomainAuthentication(domainData: DomainAuthData): Promise<DomainResponse> {
    if (!this.sesClient || !this.VerifyDomainIdentityCommand) {
      throw new Error('SES client not initialized');
    }

    try {
      this.logger.log(`Creating SES domain authentication for ${domainData.domain}`);

      const command = new this.VerifyDomainIdentityCommand({
        Domain: domainData.domain,
      });

      const result = await this.sesClient.send(command);
      
      // Enable DKIM for the domain (SES automatically handles DKIM)
      this.logger.log(`DKIM will be automatically configured for ${domainData.domain} in SES`);

      this.logger.log(`SES domain verification initiated for ${domainData.domain}`);
      
      return {
        id: domainData.domain, // SES uses domain name as identifier
        domain: domainData.domain,
        valid: false, // Initially false, needs verification
        verificationToken: result.VerificationToken,
      };
    } catch (error) {
      this.logger.error('SES domain authentication creation failed:', error);
      throw error;
    }
  }

  async validateDomainAuthentication(domainId: string): Promise<DomainVerificationResult> {
    if (!this.sesClient || !this.GetIdentityVerificationAttributesCommand) {
      throw new Error('SES client not initialized');
    }

    try {
      this.logger.log(`Validating SES domain authentication for: ${domainId}`);

      const command = new this.GetIdentityVerificationAttributesCommand({
        Identities: [domainId],
      });

      const result = await this.sesClient.send(command);
      const verificationAttributes = result.VerificationAttributes?.[domainId];
      
      const isValid = verificationAttributes?.VerificationStatus === 'Success';
      
      this.logger.log(`SES domain validation result for ${domainId}: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return {
        valid: isValid,
        validation_results: {
          verificationStatus: verificationAttributes?.VerificationStatus,
          verificationToken: verificationAttributes?.VerificationToken,
        },
      };
    } catch (error) {
      this.logger.error('SES domain validation failed:', error);
      throw error;
    }
  }

  async getDomainAuthentication(domainId: string): Promise<DomainResponse> {
    if (!this.sesClient || !this.GetIdentityVerificationAttributesCommand) {
      throw new Error('SES client not initialized');
    }

    try {
      const command = new this.GetIdentityVerificationAttributesCommand({
        Identities: [domainId],
      });

      const result = await this.sesClient.send(command);
      const verificationAttributes = result.VerificationAttributes?.[domainId];
      
      return {
        id: domainId,
        domain: domainId,
        valid: verificationAttributes?.VerificationStatus === 'Success',
        verificationToken: verificationAttributes?.VerificationToken,
      };
    } catch (error) {
      this.logger.error('SES get domain failed:', error);
      throw error;
    }
  }

  async listDomainAuthentications(): Promise<DomainResponse[]> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    try {
      const { ListIdentitiesCommand } = await import('@aws-sdk/client-ses');
      const command = new ListIdentitiesCommand({
        IdentityType: 'Domain',
      });

      const result = await this.sesClient.send(command);
      
      // Get verification status for all domains
      if (result.Identities && result.Identities.length > 0 && this.GetIdentityVerificationAttributesCommand) {
        const verificationCommand = new this.GetIdentityVerificationAttributesCommand({
          Identities: result.Identities,
        });
        
        const verificationResult = await this.sesClient.send(verificationCommand);
        
        return result.Identities.map((domain: string) => ({
          id: domain,
          domain,
          valid: verificationResult.VerificationAttributes?.[domain]?.VerificationStatus === 'Success',
          verificationToken: verificationResult.VerificationAttributes?.[domain]?.VerificationToken,
        }));
      }
      
      return [];
    } catch (error) {
      this.logger.error('SES list domains failed:', error);
      throw error;
    }
  }
}
