import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDomainDto {
  @ApiProperty({
    description: 'Set as primary domain for sending emails',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}