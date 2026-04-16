import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({ 
    description: 'Page number', 
    minimum: 1,
    default: 1,
    required: false 
  })
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: 'Number of items per page', 
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false 
  })
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Data items' })
  data!: T[];

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext!: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrevious!: boolean;
}