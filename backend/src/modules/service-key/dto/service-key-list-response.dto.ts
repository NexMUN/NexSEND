import { ApiProperty } from '@nestjs/swagger';
import { ServiceKeyResponseDto } from './service-key-response.dto';

export class ServiceKeyListResponseDto {
  @ApiProperty({
    description: 'List of service keys',
    type: [ServiceKeyResponseDto],
  })
  serviceKeys!: ServiceKeyResponseDto[];

  @ApiProperty({
    description: 'Pagination information',
  })
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  constructor(
    serviceKeys: ServiceKeyResponseDto[],
    page: number,
    limit: number,
    total: number,
  ) {
    this.serviceKeys = serviceKeys;
    const totalPages = Math.ceil(total / limit);
    
    this.pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }
}