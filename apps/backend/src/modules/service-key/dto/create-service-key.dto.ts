import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsUrl } from 'class-validator';

export class CreateServiceKeyDto {
  @ApiProperty({
    description: 'Service key name/identifier',
    example: 'Main Backend API Key',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Permissions granted to this service key',
    example: {
      organizations: ['*'],
      domains: ['*'],
      emails: ['*']
    },
  })
  @IsObject()
  @IsNotEmpty()
  permissions!: Record<string, string[]>;

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
    default: -1,
  })
  @IsOptional()
  rateLimitPerHour?: number = -1;

  @ApiProperty({
    description: 'Rate limit per day (use -1 for unlimited)',
    example: -1,
    default: -1,
  })
  @IsOptional()
  rateLimitPerDay?: number = -1;
}