import { ApiProperty } from '@nestjs/swagger';
import { Organization, OrgStatus } from '@prisma/client';

export class OrganizationResponseDto {
  @ApiProperty({
    description: 'Organization unique ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID from main service',
    example: 'org_123456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Organization status',
    enum: OrgStatus,
    example: OrgStatus.ACTIVE,
  })
  status: OrgStatus;

  @ApiProperty({
    description: 'Organization creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Organization last update date',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  constructor(organization: Organization) {
    this.id = organization.id;
    this.organizationId = organization.organizationId;
    this.status = organization.status;
    this.createdAt = organization.createdAt;
    this.updatedAt = organization.updatedAt;
  }
}