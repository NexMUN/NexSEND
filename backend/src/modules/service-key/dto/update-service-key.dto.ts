import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsUrl, IsBoolean } from 'class-validator';

export class UpdateServiceKeyDto {
  @ApiProperty({
    description: 'Service key name/identifier',
    example: 'Updated API Key Name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Permissions granted to this service key',
    example: {
      organizations: ['read', 'write'],
      domains: ['manage'],
      emails: ['send']
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, string[]>;

  @ApiProperty({
    description: 'Webhook URL for notifications',
    example: 'https://api.example.com/webhooks/email',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({
    description: 'Rate limit per hour (use -1 for unlimited)',
    example: -1,
    required: false,
  })
  @IsOptional()
  rateLimitPerHour?: number;

  @ApiProperty({
    description: 'Rate limit per day (use -1 for unlimited)',
    example: -1,
    required: false,
  })
  @IsOptional()
  rateLimitPerDay?: number;

  @ApiProperty({
    description: 'Whether the service key is active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}