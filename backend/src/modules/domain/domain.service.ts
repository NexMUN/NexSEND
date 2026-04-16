import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { DomainResponseDto, DomainDnsRecordsDto, DnsRecordDto } from './dto/domain-response.dto';
import { Domain, DomainStatus, CheckStatus } from '@prisma/client';
import { DnsLookupService } from './services/dns-lookup.service';
import { SESProvider } from '../email/providers/ses.provider';
import {
  DnsRecordDisplay,
  DomainVerificationStatus,
  DnsRecordsResponse,
  SpfGuidance,
} from './interfaces/dns-record-display.interface';
import * as crypto from 'crypto';

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);
  private readonly spfIncludeDomain: string;
  private readonly returnPathDomain: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly dnsLookupService: DnsLookupService,
    private readonly sesProvider: SESProvider,
  ) {
    this.spfIncludeDomain = this.configService.get<string>('SPF_INCLUDE_DOMAIN', '_spf.nexmun.in');
    this.returnPathDomain = this.configService.get<string>('RETURN_PATH_DOMAIN', 'bounce.nexmun.in');
  }

  private async getOrganizationByOrgId(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return organization;
  }

  async createDomain(organizationId: string, createDomainDto: CreateDomainDto): Promise<DomainResponseDto> {
    const organization = await this.getOrganizationByOrgId(organizationId);

    // Check if domain already exists
    const existingDomain = await this.prisma.domain.findUnique({
      where: { domain: createDomainDto.domain },
    });

    if (existingDomain) {
      throw new ConflictException(`Domain ${createDomainDto.domain} already exists`);
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(16).toString('hex');

    // Generate DKIM keys
    const dkimSelector = `email-${Date.now()}`;
    const { publicKey, privateKey } = await this.generateDkimKeys();

    // Create AWS SES domain authentication
    let sesVerificationToken: string | null = null;
    try {
      const sesResult = await this.sesProvider.createDomainAuthentication({
        domain: createDomainDto.domain,
      });
      sesVerificationToken = sesResult.verificationToken || null;
      this.logger.log(`SES domain verification initiated for ${createDomainDto.domain} - Token: ${sesVerificationToken}`);
    } catch (error) {
      this.logger.warn(`Failed to create SES domain authentication for ${createDomainDto.domain}:`, error instanceof Error ? error.message : String(error));
    }

    // If setting as primary, unset current primary
    if (createDomainDto.isPrimary) {
      await this.prisma.domain.updateMany({
        where: {
          organizationId: organization.id,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const domain = await this.prisma.domain.create({
      data: {
        organizationId: organization.id,
        domain: createDomainDto.domain,
        verificationToken,
        dkimSelector,
        dkimPrivateKey: privateKey, // In production, encrypt this
        dkimPublicKey: publicKey,
        returnPathDomain: this.returnPathDomain,
        spfInclude: this.spfIncludeDomain,
        isPrimary: createDomainDto.isPrimary || false,
        status: DomainStatus.PENDING,
      } as any,
    });

    // Create verification checks
    await this.createVerificationChecks(domain);

    this.logger.log(`Created domain ${domain.domain} for organization ${organizationId}`);

    return this.mapToResponseDto(domain);
  }

  async getDomains(organizationId: string): Promise<DomainResponseDto[]> {
    const organization = await this.getOrganizationByOrgId(organizationId);
    
    const domains = await this.prisma.domain.findMany({
      where: { organizationId: organization.id },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return domains.map(domain => this.mapToResponseDto(domain));
  }

  async getDomainById(organizationId: string, domainId: string): Promise<DomainResponseDto> {
    const organization = await this.getOrganizationByOrgId(organizationId);

    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.mapToResponseDto(domain);
  }

  async updateDomain(
    organizationId: string,
    domainId: string,
    updateDomainDto: UpdateDomainDto,
  ): Promise<DomainResponseDto> {
    const organization = await this.getOrganizationByOrgId(organizationId);
    
    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // If setting as primary, unset current primary
    if (updateDomainDto.isPrimary === true) {
      await this.prisma.domain.updateMany({
        where: {
          organizationId: organization.id,
          isPrimary: true,
          id: { not: domainId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const updatedDomain = await this.prisma.domain.update({
      where: { id: domainId },
      data: updateDomainDto,
    });

    return this.mapToResponseDto(updatedDomain);
  }

  async deleteDomain(organizationId: string, domainId: string): Promise<DomainResponseDto> {
    const organization = await this.getOrganizationByOrgId(organizationId);

    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (domain.isPrimary) {
      throw new BadRequestException('Cannot delete primary domain. Please set another domain as primary first.');
    }

    // Store domain data before deletion
    const deletedDomainData = this.mapToResponseDto(domain);

    await this.prisma.domain.delete({
      where: { id: domainId },
    });

    this.logger.log(`Deleted domain ${domain.domain}`);

    return deletedDomainData;
  }

  async getDnsRecords(organizationId: string, domainId: string): Promise<DnsRecordsResponse> {
    const organization = await this.getOrganizationByOrgId(organizationId);

    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
      include: {
        verificationChecks: true,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const requiredRecords = this.generateRequiredDnsRecords(domain);
    const optionalRecords = this.generateOptionalDnsRecords(domain);

    // Add SPF record as a required record
    const spfRecord = await this.generateSpfDnsRecord(domain);
    requiredRecords.push(spfRecord);

    // Add AWS SES DNS records
    try {
      const sesRecords = await this.generateSesDnsRecords(domain.domain);
      if (sesRecords.length > 0) {
        // Add SES records to required records for SES functionality
        requiredRecords.push(...sesRecords);
        this.logger.log(`Added ${sesRecords.length} SES DNS records for domain ${domain.domain}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to generate SES DNS records for domain ${domain.domain}:`, error instanceof Error ? error.message : String(error));
    }

    return {
      domain: domain.domain,
      status: domain.status,
      requiredRecords,
      optionalRecords,
      guidance: {
        spf: spfRecord.spfGuidance,
      },
    };
  }

  async getVerificationStatus(organizationId: string, domainId: string): Promise<DomainVerificationStatus> {
    const organization = await this.getOrganizationByOrgId(organizationId);

    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
      include: {
        verificationChecks: true,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const overallStatus = this.calculateOverallStatus(domain.verificationChecks);

    return {
      domain: domain.domain,
      overallStatus,
      checks: domain.verificationChecks.map(check => ({
        type: check.checkType,
        name: check.recordName,
        status: check.status,
        expectedValue: check.expectedValue,
        actualValue: check.actualValue,
        errorMessage: check.errorMessage,
        lastCheckedAt: check.lastCheckedAt,
      })),
    };
  }

  async verifyDomain(organizationId: string, domainId: string): Promise<DomainResponseDto> {
    const organization = await this.getOrganizationByOrgId(organizationId);
    
    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
      include: {
        verificationChecks: true,
      },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Perform DNS checks (existing logic)
    const verificationResults = await this.performDnsVerification(domain);

    // Update or create check statuses
    for (const result of verificationResults) {
      const { recordName, expectedValue } = await this.getCheckRecordDetails(domain, result.checkType);

      await this.prisma.domainVerificationCheck.upsert({
        where: {
          domainId_checkType: {
            domainId: domain.id,
            checkType: result.checkType,
          },
        },
        update: {
          status: result.passed ? CheckStatus.PASSED : CheckStatus.FAILED,
          actualValue: result.actualValue,
          errorMessage: result.errorMessage,
          lastCheckedAt: new Date(),
        },
        create: {
          domainId: domain.id,
          checkType: result.checkType,
          recordName,
          expectedValue,
          status: result.passed ? CheckStatus.PASSED : CheckStatus.FAILED,
          actualValue: result.actualValue,
          errorMessage: result.errorMessage,
          lastCheckedAt: new Date(),
        },
      });
    }

    // Check if all required checks pass
    // Note: SPF and SES_DOMAIN_VERIFY are also required but may not always be in results
    const requiredChecks = ['TXT_VERIFY', 'DKIM', 'SPF', 'SES_DOMAIN_VERIFY'];
    const requiredResults = verificationResults.filter(r => requiredChecks.includes(r.checkType));
    const allRequiredPass = requiredResults.length > 0 && requiredResults.every(r => r.passed);

    // Build detailed status for ALL checks (both passed and failed)
    const allCheckDetails = this.buildCheckDetails(domain, requiredResults);
    const passedChecks = allCheckDetails.filter(c => c.passed);
    const failedChecks = allCheckDetails.filter(c => !c.passed);

    if (allRequiredPass) {
      const updatedDomain = await this.prisma.domain.update({
        where: { id: domainId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          status: DomainStatus.VERIFIED,
          failureCount: 0,
          lastCheckAt: new Date(),
        },
      });

      this.logger.log(`Domain ${domain.domain} verified successfully via DNS checks`);

      // Return domain data WITH verification check details
      return {
        ...this.mapToResponseDto(updatedDomain),
        verificationDetails: {
          summary: {
            total: allCheckDetails.length,
            passed: passedChecks.length,
            failed: failedChecks.length,
          },
          checks: allCheckDetails,
        },
      };
    } else {
      await this.prisma.domain.update({
        where: { id: domainId },
        data: {
          failureCount: { increment: 1 },
          lastCheckAt: new Date(),
          status: DomainStatus.FAILED,
        },
      });

      const failedCheckNames = failedChecks.map(c => c.checkType).join(', ');

      // NestJS HttpException format: pass the full error response as a single object
      const errorResponse = {
        statusCode: 400,
        message: `Domain verification failed. The following checks did not pass: ${failedCheckNames}. Please ensure all DNS records are properly configured.`,
        error: {
          code: 'VERIFICATION_FAILED',
          message: `Domain verification failed. The following checks did not pass: ${failedCheckNames}. Please ensure all DNS records are properly configured.`,
          summary: {
            total: allCheckDetails.length,
            passed: passedChecks.length,
            failed: failedChecks.length,
          },
          checks: allCheckDetails,
        },
      };

      throw new BadRequestException(errorResponse);
    }
  }

  /**
   * Get record name and expected value for a specific check type
   */
  private async getCheckRecordDetails(
    domain: Domain,
    checkType: string
  ): Promise<{ recordName: string; expectedValue: string }> {
    switch (checkType) {
      case 'TXT_VERIFY':
        return {
          recordName: `_notification-verify.${domain.domain}`,
          expectedValue: `notification-verify=${domain.verificationToken}`,
        };

      case 'DKIM':
        return {
          recordName: `${domain.dkimSelector}._domainkey.${domain.domain}`,
          expectedValue: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
        };

      case 'SPF':
        const includeValue = `include:${domain.spfInclude || this.spfIncludeDomain}`;
        return {
          recordName: domain.domain,
          expectedValue: `v=spf1 ${includeValue} ~all`,
        };

      case 'SES_DOMAIN_VERIFY':
        try {
          const sesDomainAuth = await this.sesProvider.getDomainAuthentication(domain.domain);
          return {
            recordName: domain.domain,
            expectedValue: sesDomainAuth.verificationToken || 'AWS SES verification token',
          };
        } catch (error) {
          return {
            recordName: domain.domain,
            expectedValue: 'AWS SES verification token',
          };
        }

      case 'BOUNCE_CNAME':
        return {
          recordName: `${domain.bounceSubdomain}.${domain.domain}`,
          expectedValue: domain.returnPathDomain || this.returnPathDomain,
        };

      default:
        return {
          recordName: domain.domain,
          expectedValue: 'Unknown check type',
        };
    }
  }

  private async createVerificationChecks(domain: Domain): Promise<void> {
    const checks = [
      {
        checkType: 'TXT_VERIFY',
        recordName: `_notification-verify.${domain.domain}`,
        expectedValue: `notification-verify=${domain.verificationToken}`,
      },
      {
        checkType: 'DKIM',
        recordName: `${domain.dkimSelector}._domainkey.${domain.domain}`,
        expectedValue: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
      },
      {
        checkType: 'BOUNCE_CNAME',
        recordName: `${domain.bounceSubdomain}.${domain.domain}`,
        expectedValue: domain.returnPathDomain || this.returnPathDomain,
      },
    ];

    await this.prisma.domainVerificationCheck.createMany({
      data: checks.map(check => ({
        domainId: domain.id,
        ...check,
      })),
    });
  }

  /**
   * Build detailed check information for verification results
   */
  private buildCheckDetails(domain: Domain, verificationResults: Array<{
    checkType: string;
    passed: boolean;
    actualValue: string | null;
    errorMessage?: string;
  }>) {
    return verificationResults.map(r => {
      let recordName = '';
      let expectedValue = '';
      let howToFix = '';

      if (r.checkType === 'TXT_VERIFY') {
        recordName = `_notification-verify.${domain.domain}`;
        expectedValue = `notification-verify=${domain.verificationToken}`;
        howToFix = r.passed
          ? 'DNS record is correctly configured'
          : `Add a TXT record with name '${recordName}' and value '${expectedValue}'`;
      } else if (r.checkType === 'DKIM') {
        recordName = `${domain.dkimSelector}._domainkey.${domain.domain}`;
        expectedValue = `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`;
        howToFix = r.passed
          ? 'DNS record is correctly configured'
          : `Add a TXT record with name '${recordName}' and value '${expectedValue}'`;
      } else if (r.checkType === 'SPF') {
        recordName = domain.domain;
        const includeValue = `include:${domain.spfInclude || this.spfIncludeDomain}`;
        expectedValue = `v=spf1 ${includeValue} ~all`;
        howToFix = r.passed
          ? 'SPF record is correctly configured'
          : r.actualValue
            ? `Update your SPF record to include ${includeValue}. Current: "${r.actualValue}"`
            : `Add a TXT record with name '${recordName}' and value '${expectedValue}'. This is CRITICAL for email deliverability.`;
      } else if (r.checkType === 'SES_DOMAIN_VERIFY') {
        recordName = domain.domain;
        expectedValue = r.errorMessage?.includes('token') ? 'AWS SES verification token' : 'Check AWS SES console for verification token';
        howToFix = r.passed
          ? 'AWS SES domain verification record is correctly configured'
          : `Add the AWS SES domain verification TXT record to '${recordName}'. Check AWS SES console for the exact token value.`;
      }

      return {
        checkType: r.checkType,
        recordName,
        expectedValue,
        actualValue: r.actualValue || null,
        status: r.passed ? 'PASSED' : (r.actualValue ? 'INCORRECT' : 'NOT_FOUND'),
        howToFix,
        passed: r.passed,
      };
    });
  }

  private resolveVariables(template: string, variables: Record<string, string>): string {
    let resolved = template;
    for (const [key, value] of Object.entries(variables)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return resolved;
  }

  private generateRequiredDnsRecords(domain: Domain): DnsRecordDisplay[] {
    const records: DnsRecordDisplay[] = [];

    // Domain verification TXT record
    const txtVariables = {
      VERIFICATION_TOKEN: domain.verificationToken,
    };
    const txtRecordName = `_notification-verify.${domain.domain}`;
    const txtRecordValue = 'notification-verify={{VERIFICATION_TOKEN}}';

    records.push({
      type: 'required',
      record: {
        type: 'TXT',
        name: txtRecordName,
        value: txtRecordValue,
        ttl: 3600,
      },
      resolvedRecord: {
        type: 'TXT',
        name: txtRecordName,
        value: this.resolveVariables(txtRecordValue, txtVariables),
        ttl: 3600,
      },
      variables: txtVariables,
      instructions: 'Add this TXT record to verify domain ownership',
      checkType: 'TXT_VERIFY',
      needsUpdate: true, // Always needs to be added for verification
    });

    // DKIM record
    if (domain.dkimSelector && domain.dkimPublicKey) {
      const dkimVariables = {
        DKIM_SELECTOR: domain.dkimSelector,
        DKIM_PUBLIC_KEY: domain.dkimPublicKey,
      };
      const dkimRecordName = `{{DKIM_SELECTOR}}._domainkey.${domain.domain}`;
      const dkimRecordValue = 'v=DKIM1; k=rsa; p={{DKIM_PUBLIC_KEY}}';

      records.push({
        type: 'required',
        record: {
          type: 'TXT',
          name: dkimRecordName,
          value: dkimRecordValue,
          ttl: 3600,
        },
        resolvedRecord: {
          type: 'TXT',
          name: this.resolveVariables(dkimRecordName, dkimVariables),
          value: this.resolveVariables(dkimRecordValue, dkimVariables),
          ttl: 3600,
        },
        variables: dkimVariables,
        instructions: 'DKIM key for email authentication',
        checkType: 'DKIM',
        needsUpdate: true, // Always needs to be added for verification
      });
    }

    return records;
  }

  private generateOptionalDnsRecords(domain: Domain): DnsRecordDisplay[] {
    const records: DnsRecordDisplay[] = [];

    // Bounce handling CNAME
    const bounceVariables = {
      BOUNCE_SUBDOMAIN: domain.bounceSubdomain,
      RETURN_PATH_DOMAIN: domain.returnPathDomain || this.returnPathDomain,
    };
    const bounceRecordName = `{{BOUNCE_SUBDOMAIN}}.${domain.domain}`;
    const bounceRecordValue = '{{RETURN_PATH_DOMAIN}}';

    records.push({
      type: 'optional',
      record: {
        type: 'CNAME',
        name: bounceRecordName,
        value: bounceRecordValue,
        ttl: 3600,
      },
      resolvedRecord: {
        type: 'CNAME',
        name: this.resolveVariables(bounceRecordName, bounceVariables),
        value: this.resolveVariables(bounceRecordValue, bounceVariables),
        ttl: 3600,
      },
      variables: bounceVariables,
      instructions: 'Configure for bounce handling and better deliverability',
      checkType: 'BOUNCE_CNAME',
      needsUpdate: true, // Optional but recommended for better deliverability
    });

    return records;
  }

  private async generateSpfDnsRecord(domain: Domain): Promise<DnsRecordDisplay & { spfGuidance: SpfGuidance }> {
    const currentSpf = await this.dnsLookupService.lookupSpfRecord(domain.domain);
    const includeValue = `include:${domain.spfInclude || this.spfIncludeDomain}`;
    let action: string;
    let example: string;
    let instructions: string;
    let needsUpdate: boolean;

    if (currentSpf) {
      // Check if our include is already there
      if (currentSpf.includes(includeValue)) {
        action = 'Already configured';
        example = currentSpf;
        instructions = `SPF record already includes ${includeValue}. No changes needed.`;
        needsUpdate = false;
      } else {
        // Generate example with our include added
        example = currentSpf.replace('~all', `${includeValue} ~all`).replace('-all', `${includeValue} -all`);
        action = 'Update existing SPF record';
        instructions = `Update your existing SPF record to include ${includeValue}. Change from "${currentSpf}" to "${example}"`;
        needsUpdate = true;
      }
    } else {
      action = 'Create new SPF record';
      example = `v=spf1 ${includeValue} ~all`;
      instructions = `Create a new SPF TXT record for ${domain.domain} with value "${example}". This is CRITICAL for email deliverability.`;
      needsUpdate = true;
    }

    const spfGuidance: SpfGuidance = {
      action,
      includeValue,
      example,
      currentSpf,
    };

    const spfRecordData = {
      type: 'TXT' as const,
      name: domain.domain,
      value: example,
      ttl: 3600,
    };

    return {
      type: 'required',
      record: {
        type: 'TXT',
        name: domain.domain,
        value: `v=spf1 ${includeValue} ~all`,
        ttl: 3600,
      },
      resolvedRecord: spfRecordData,
      variables: {
        SPF_INCLUDE: includeValue,
      },
      instructions,
      checkType: 'SPF',
      needsUpdate,
      spfGuidance,
    };
  }

  private async generateSpfGuidance(domain: Domain): Promise<SpfGuidance> {
    const currentSpf = await this.dnsLookupService.lookupSpfRecord(domain.domain);
    const includeValue = `include:${domain.spfInclude || this.spfIncludeDomain}`;

    if (currentSpf) {
      // Check if our include is already there
      if (currentSpf.includes(includeValue)) {
        return {
          action: 'Already configured',
          includeValue,
          example: currentSpf,
          currentSpf,
        };
      }

      // Generate example with our include added
      const example = currentSpf.replace('~all', `${includeValue} ~all`).replace('-all', `${includeValue} -all`);

      return {
        action: 'Add to existing SPF record',
        includeValue,
        example,
        currentSpf,
      };
    }

    return {
      action: 'Create new SPF record',
      includeValue,
      example: `v=spf1 ${includeValue} ~all`,
      currentSpf: null,
    };
  }

  private async performDnsVerification(domain: Domain): Promise<
    Array<{
      checkType: string;
      passed: boolean;
      actualValue: string | null;
      errorMessage?: string;
    }>
  > {
    const results = [];

    // Verify TXT record
    const txtRecordName = `_notification-verify.${domain.domain}`;
    const expectedTxtValue = `notification-verify=${domain.verificationToken}`;
    const txtVerified = await this.dnsLookupService.verifyTxtRecord(txtRecordName, expectedTxtValue);
    const txtRecords = await this.dnsLookupService.lookupTxtRecords(txtRecordName);

    results.push({
      checkType: 'TXT_VERIFY',
      passed: txtVerified,
      actualValue: txtRecords.join('; ') || null,
      errorMessage: txtVerified ? undefined : 'TXT record not found or incorrect value',
    });

    // Verify DKIM record if configured
    if (domain.dkimSelector && domain.dkimPublicKey) {
      const dkimRecordName = `${domain.dkimSelector}._domainkey.${domain.domain}`;
      const dkimRecords = await this.dnsLookupService.lookupTxtRecords(dkimRecordName);
      const dkimValue = dkimRecords.find(r => r.includes('v=DKIM1'));
      const dkimPassed = dkimValue?.includes(`p=${domain.dkimPublicKey}`) || false;

      results.push({
        checkType: 'DKIM',
        passed: dkimPassed,
        actualValue: dkimValue || null,
        errorMessage: dkimPassed ? undefined : 'DKIM record not found or incorrect public key',
      });
    }

    // Verify SPF record (required for email deliverability)
    const includeValue = `include:${domain.spfInclude || this.spfIncludeDomain}`;
    const spfRecords = await this.dnsLookupService.lookupSpfRecord(domain.domain);
    const spfPassed = spfRecords ? spfRecords.includes(includeValue) : false;

    results.push({
      checkType: 'SPF',
      passed: spfPassed,
      actualValue: spfRecords || null,
      errorMessage: spfPassed ? undefined : `SPF record not found or missing ${includeValue}`,
    });

    // Verify SES domain verification record (if SES is being used)
    try {
      const sesDomainAuth = await this.sesProvider.getDomainAuthentication(domain.domain);
      if (sesDomainAuth.verificationToken) {
        const sesToken = sesDomainAuth.verificationToken; // Store in variable for TypeScript
        const sesTxtRecords = await this.dnsLookupService.lookupTxtRecords(domain.domain);
        const sesVerified = sesTxtRecords.some(record => record.includes(sesToken));

        results.push({
          checkType: 'SES_DOMAIN_VERIFY',
          passed: sesVerified,
          actualValue: sesTxtRecords.join('; ') || null,
          errorMessage: sesVerified ? undefined : 'AWS SES domain verification TXT record not found',
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to verify SES domain for ${domain.domain}:`, error instanceof Error ? error.message : String(error));
      // Don't fail verification if SES check fails, just skip it
    }

    // Verify bounce CNAME (optional)
    const bounceRecordName = `${domain.bounceSubdomain}.${domain.domain}`;
    const expectedCname = domain.returnPathDomain || this.returnPathDomain;
    const cnameVerified = await this.dnsLookupService.verifyCnameRecord(bounceRecordName, expectedCname);
    const actualCname = await this.dnsLookupService.lookupCnameRecord(bounceRecordName);

    results.push({
      checkType: 'BOUNCE_CNAME',
      passed: cnameVerified,
      actualValue: actualCname,
      errorMessage: cnameVerified ? undefined : 'CNAME record not found or incorrect value',
    });

    return results;
  }

  private calculateOverallStatus(checks: any[]): DomainVerificationStatus['overallStatus'] {
    if (checks.length === 0) {
      return 'NOT_STARTED';
    }

    const requiredChecks = checks.filter(c => ['TXT_VERIFY', 'DKIM', 'SPF', 'SES_DOMAIN_VERIFY'].includes(c.checkType));
    const allRequiredPassed = requiredChecks.length > 0 && requiredChecks.every(c => c.status === CheckStatus.PASSED);
    const someChecksPassed = checks.some(c => c.status === CheckStatus.PASSED);
    const someChecksFailed = checks.some(c => c.status === CheckStatus.FAILED);

    if (allRequiredPassed) {
      return 'VERIFIED';
    } else if (someChecksFailed && !someChecksPassed) {
      return 'FAILED';
    } else if (someChecksPassed) {
      return 'PARTIALLY_VERIFIED';
    } else {
      return 'IN_PROGRESS';
    }
  }

  private async generateDkimKeys(): Promise<{ publicKey: string; privateKey: string }> {
    // In production, use proper crypto library like node-forge or crypto.generateKeyPair
    // For now, return placeholder keys
    return {
      publicKey:
        'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3QEKyU1fSma0axspqYK5iAj+54lsAg4qRRCnpKK68hawSd8zpsDz77ntGCR0X2mHVvkHbX6dX' +
        'CIBPuQlaVeqpn6lp6SSA6bYkRocKQ4JID5kAZvgC/KqnfA4xL2Bo2UKGGNxJ3vqLAP/PliF3MXSbJmsKUFTQJhLdMQIDAQAB',
      privateKey: 'placeholder-private-key', // This should be properly generated
    };
  }

  private async generateSesDnsRecords(domain: string): Promise<DnsRecordDisplay[]> {
    const records: DnsRecordDisplay[] = [];

    try {
      // Get SES domain authentication details
      const sesDomainAuth = await this.sesProvider.getDomainAuthentication(domain);
      
      if (sesDomainAuth.verificationToken) {
        // Add SES domain verification TXT record
        const sesVerifyRecord = {
          type: 'TXT' as const,
          name: domain,
          value: sesDomainAuth.verificationToken,
          ttl: 3600,
        };
        records.push({
          type: 'required',
          record: sesVerifyRecord,
          resolvedRecord: sesVerifyRecord,
          variables: {},
          instructions: 'AWS SES domain verification record',
          checkType: 'SES_DOMAIN_VERIFY',
          needsUpdate: true,
        });
      }

      // Get SES DKIM records
      try {
        const { GetIdentityDkimAttributesCommand } = await import('@aws-sdk/client-ses');
        const command = new GetIdentityDkimAttributesCommand({
          Identities: [domain],
        });
        
        const sesClient = (this.sesProvider as any).sesClient;
        if (sesClient) {
          const result = await sesClient.send(command);
          const dkimAttributes = result.DkimAttributes?.[domain];
          
          if (dkimAttributes?.DkimTokens && dkimAttributes.DkimTokens.length > 0) {
            // Add SES DKIM CNAME records
            dkimAttributes.DkimTokens.forEach((token: string, index: number) => {
              const sesDkimRecord = {
                type: 'CNAME' as const,
                name: `${token}._domainkey.${domain}`,
                value: `${token}.dkim.amazonses.com`,
                ttl: 3600,
              };
              records.push({
                type: 'required',
                record: sesDkimRecord,
                resolvedRecord: sesDkimRecord,
                variables: {},
                instructions: `AWS SES DKIM CNAME record ${index + 1}`,
                checkType: 'SES_DKIM_CNAME',
                needsUpdate: true,
              });
            });
          }
        }
      } catch (dkimError) {
        this.logger.warn(`Failed to get SES DKIM records for ${domain}:`, dkimError instanceof Error ? dkimError.message : String(dkimError));
      }

    } catch (error) {
      this.logger.error(`Failed to generate SES DNS records for ${domain}:`, error instanceof Error ? error.message : String(error));
    }

    return records;
  }

  private mapToResponseDto(domain: Domain): DomainResponseDto {
    return {
      id: domain.id,
      organizationId: domain.organizationId,
      domain: domain.domain,
      isVerified: domain.isVerified,
      status: domain.status,
      isPrimary: domain.isPrimary,
      verificationMethod: domain.verificationMethod,
      verifiedAt: domain.verifiedAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
