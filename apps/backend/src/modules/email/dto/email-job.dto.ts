import { ApiProperty } from '@nestjs/swagger';
import { EmailStatus } from '@prisma/client';

export class EmailJobResponseDto {
  @ApiProperty({ description: 'Job ID' })
  id!: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId!: string;

  @ApiProperty({ description: 'Recipient email' })
  to!: string;

  @ApiProperty({ description: 'Email subject' })
  subject!: string;

  @ApiProperty({ description: 'Job status', enum: EmailStatus })
  status!: EmailStatus;

  @ApiProperty({ description: 'Send attempt count' })
  attempts!: number;

  @ApiProperty({ description: 'Last error message', required: false })
  lastError?: string | null;

  @ApiProperty({ description: 'Sent timestamp', required: false })
  sentAt?: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;
}

export class EmailJobListResponseDto {
  @ApiProperty({ description: 'List of email jobs', type: [EmailJobResponseDto] })
  data!: EmailJobResponseDto[];

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total items' })
  total!: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext!: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrevious!: boolean;
}