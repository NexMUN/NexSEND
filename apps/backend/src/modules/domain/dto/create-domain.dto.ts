import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, IsOptional, IsBoolean } from 'class-validator';

export class CreateDomainDto {
  @ApiProperty({
    description: 'Domain name to add',
    example: 'mail.example.com',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, {
    message: 'Invalid domain format',
  })
  domain!: string;

  @ApiProperty({
    description: 'Set as primary domain for sending emails',
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;
}