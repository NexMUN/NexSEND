import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Health status of the service' })
  status!: string;

  @ApiProperty({ 
    example: '2024-01-15T10:30:00.000Z', 
    description: 'Current timestamp in ISO format' 
  })
  timestamp!: string;

  @ApiProperty({ 
    example: 'notification-backend', 
    description: 'Name of the service' 
  })
  service!: string;

  @ApiProperty({ 
    example: 123.456, 
    description: 'Service uptime in seconds' 
  })
  uptime!: number;
}