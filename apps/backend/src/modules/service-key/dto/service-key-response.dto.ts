import { ApiProperty } from '@nestjs/swagger';
import { ServiceKey } from '@prisma/client';

export class ServiceKeyResponseDto {
  @ApiProperty({ description: 'Service key internal ID' })
  id!: string;

  @ApiProperty({ description: 'Service ID (external identifier)' })
  serviceId!: string;

  @ApiProperty({ description: 'Service key name' })
  name!: string;

  @ApiProperty({ description: 'Permissions granted to this service key' })
  permissions!: Record<string, string[]>;

  @ApiProperty({ description: 'Webhook URL for notifications', required: false })
  webhookUrl?: string | null;

  @ApiProperty({ description: 'Whether the service key is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Rate limit per hour (-1 for unlimited)' })
  rateLimitPerHour!: number;

  @ApiProperty({ description: 'Rate limit per day (-1 for unlimited)' })
  rateLimitPerDay!: number;

  @ApiProperty({ description: 'Last used timestamp', required: false })
  lastUsedAt?: Date | null;

  @ApiProperty({ description: 'Expiration timestamp (null for no expiration)', required: false })
  expiresAt?: Date | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  constructor(serviceKey: ServiceKey) {
    this.id = serviceKey.id;
    this.serviceId = serviceKey.serviceId;
    this.name = serviceKey.name;
    this.permissions = serviceKey.permissions as Record<string, string[]>;
    this.webhookUrl = serviceKey.webhookUrl;
    this.isActive = serviceKey.isActive;
    this.rateLimitPerHour = serviceKey.rateLimitPerHour;
    this.rateLimitPerDay = serviceKey.rateLimitPerDay;
    this.lastUsedAt = serviceKey.lastUsedAt;
    this.expiresAt = serviceKey.expiresAt;
    this.createdAt = serviceKey.createdAt;
    this.updatedAt = serviceKey.updatedAt;
  }
}