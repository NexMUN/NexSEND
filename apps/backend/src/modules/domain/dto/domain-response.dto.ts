import { ApiProperty } from '@nestjs/swagger';
import { DomainStatus, VerificationMethod } from '@prisma/client';

export class VerificationCheckDetailDto {
  @ApiProperty({ description: 'Type of verification check' })
  checkType!: string;

  @ApiProperty({ description: 'DNS record name being verified' })
  recordName!: string;

  @ApiProperty({ description: 'Expected DNS record value' })
  expectedValue!: string;

  @ApiProperty({ description: 'Actual DNS record value found', required: false })
  actualValue!: string | null;

  @ApiProperty({ description: 'Check status' })
  status!: string;

  @ApiProperty({ description: 'How to fix this DNS record' })
  howToFix!: string;

  @ApiProperty({ description: 'Whether check passed' })
  passed!: boolean;
}

export class VerificationSummaryDto {
  @ApiProperty({ description: 'Total number of checks' })
  total!: number;

  @ApiProperty({ description: 'Number of passed checks' })
  passed!: number;

  @ApiProperty({ description: 'Number of failed checks' })
  failed!: number;
}

export class VerificationDetailsDto {
  @ApiProperty({ description: 'Verification summary', type: VerificationSummaryDto })
  summary!: VerificationSummaryDto;

  @ApiProperty({ description: 'Individual check details', type: [VerificationCheckDetailDto] })
  checks!: VerificationCheckDetailDto[];
}

export class DomainResponseDto {
  @ApiProperty({ description: 'Domain ID' })
  id!: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId!: string;

  @ApiProperty({ description: 'Domain name' })
  domain!: string;

  @ApiProperty({ description: 'Verification status' })
  isVerified!: boolean;

  @ApiProperty({ description: 'Domain status', enum: DomainStatus })
  status!: DomainStatus;

  @ApiProperty({ description: 'Primary domain flag' })
  isPrimary!: boolean;

  @ApiProperty({ description: 'Verification method', enum: VerificationMethod })
  verificationMethod!: VerificationMethod;

  @ApiProperty({ description: 'Verified at timestamp', required: false })
  verifiedAt?: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Detailed verification check results', type: VerificationDetailsDto, required: false })
  verificationDetails?: VerificationDetailsDto;
}

export class DnsRecordDto {
  @ApiProperty({ description: 'Record type (TXT, MX, CNAME)' })
  type!: string;

  @ApiProperty({ description: 'Record name/host' })
  name!: string;

  @ApiProperty({ description: 'Record value' })
  value!: string;

  @ApiProperty({ description: 'TTL in seconds', default: 3600 })
  ttl?: number;

  @ApiProperty({ description: 'Priority (for MX records)', required: false })
  priority?: number;
}

export class DomainDnsRecordsDto {
  @ApiProperty({ description: 'Domain name' })
  domain!: string;

  @ApiProperty({ description: 'Verification status' })
  isVerified!: boolean;

  @ApiProperty({ description: 'Required DNS records', type: [DnsRecordDto] })
  records!: DnsRecordDto[];

  @ApiProperty({ description: 'Instructions for adding DNS records' })
  instructions!: string;
}

export class DnsRecordDisplayDto {
  @ApiProperty({ description: 'Record type', enum: ['required', 'optional', 'guidance'] })
  type!: 'required' | 'optional' | 'guidance';

  @ApiProperty({ description: 'DNS record details', type: DnsRecordDto })
  record!: DnsRecordDto;

  @ApiProperty({ description: 'Variable placeholders and their values' })
  variables!: Record<string, string>;

  @ApiProperty({ description: 'Instructions for this record' })
  instructions!: string;

  @ApiProperty({ description: 'Check type for verification', required: false })
  checkType?: string;
}

export class SpfGuidanceDto {
  @ApiProperty({ description: 'Action to take' })
  action!: string;

  @ApiProperty({ description: 'SPF include value' })
  includeValue!: string;

  @ApiProperty({ description: 'Example SPF record' })
  example!: string;

  @ApiProperty({ description: 'Current SPF record', required: false })
  currentSpf?: string | null;
}

class DnsGuidanceDto {
  @ApiProperty({ description: 'SPF configuration guidance', type: SpfGuidanceDto, required: false })
  spf?: SpfGuidanceDto;
}

export class DnsRecordsResponseDto {
  @ApiProperty({ description: 'Domain name' })
  domain!: string;

  @ApiProperty({ description: 'Domain status' })
  status!: string;

  @ApiProperty({ description: 'Required DNS records', type: [DnsRecordDisplayDto] })
  requiredRecords!: DnsRecordDisplayDto[];

  @ApiProperty({ description: 'Optional DNS records', type: [DnsRecordDisplayDto] })
  optionalRecords!: DnsRecordDisplayDto[];

  @ApiProperty({
    description: 'DNS configuration guidance',
    type: DnsGuidanceDto
  })
  guidance!: DnsGuidanceDto;
}
