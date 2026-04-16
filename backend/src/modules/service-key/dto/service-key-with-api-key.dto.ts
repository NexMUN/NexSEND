import { ApiProperty } from '@nestjs/swagger';
import { ServiceKeyResponseDto } from './service-key-response.dto';
import { ServiceKey } from '@prisma/client';

export class ServiceKeyWithApiKeyDto extends ServiceKeyResponseDto {
  @ApiProperty({ 
    description: 'Raw API key (only shown once during creation/regeneration)',
    example: 'sk_1234567890abcdef...'
  })
  apiKey!: string;

  constructor(serviceKey: ServiceKey, rawApiKey: string) {
    super(serviceKey);
    this.apiKey = rawApiKey;
  }
}