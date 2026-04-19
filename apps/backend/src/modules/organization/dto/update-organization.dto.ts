import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrgStatus } from '@prisma/client';

export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization status',
    enum: OrgStatus,
    required: false,
  })
  @IsEnum(OrgStatus)
  @IsOptional()
  status?: OrgStatus;
}