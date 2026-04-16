import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsEmail, IsObject } from 'class-validator';
import { OrgStatus } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Organization ID from main service',
    example: 'org_123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({
    description: 'Organization email',
    example: 'admin@acme.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Webhook URL for notifications',
    example: 'https://api.acme.com/webhooks/email',
    required: false,
  })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({
    description: 'Webhook secret for verification',
    required: false,
  })
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @ApiProperty({
    description: 'Organization settings',
    default: {},
    required: false,
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any> = {};

  @ApiProperty({
    description: 'Organization metadata',
    default: {},
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any> = {};

  @ApiProperty({
    description: 'Organization status',
    enum: OrgStatus,
    default: OrgStatus.ACTIVE,
    required: false,
  })
  @IsEnum(OrgStatus)
  @IsOptional()
  status?: OrgStatus = OrgStatus.ACTIVE;
}