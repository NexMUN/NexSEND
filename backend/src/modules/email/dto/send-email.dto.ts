import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsObject, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum EmailPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export class EmailAttachmentDto {
  @ApiProperty({ description: 'Attachment filename' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({ description: 'Base64 encoded content or URL' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ description: 'Content type', required: false })
  @IsString()
  @IsOptional()
  contentType?: string;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Email address prefix (e.g., "support", "hello", "no-reply")', required: false })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({ description: 'Display name for sender (e.g., "Support Team", "Hello Team")', required: false })
  @IsString()
  @IsOptional()
  fromName?: string;

  @ApiProperty({ description: 'Reply-to email address', required: false })
  @IsEmail()
  @IsOptional()
  replyTo?: string;

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ description: 'Plain text content', required: false })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ description: 'HTML content', required: false })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiProperty({ description: 'Template ID', required: false })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ description: 'Template variables', required: false })
  @IsObject()
  @IsOptional()
  templateData?: Record<string, any>;

  @ApiProperty({ description: 'CC recipients', required: false })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  cc?: string[];

  @ApiProperty({ description: 'BCC recipients', required: false })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  bcc?: string[];

  @ApiProperty({ description: 'Email attachments', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @IsOptional()
  attachments?: EmailAttachmentDto[];

  @ApiProperty({ description: 'Email priority', enum: EmailPriority, default: EmailPriority.NORMAL })
  @IsEnum(EmailPriority)
  @IsOptional()
  priority?: EmailPriority = EmailPriority.NORMAL;

  @ApiProperty({ description: 'Custom headers', required: false })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiProperty({ description: 'Tags for categorization', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: 'Metadata for tracking', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendBulkEmailDto {
  @ApiProperty({ description: 'List of emails to send', type: [SendEmailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendEmailDto)
  emails!: SendEmailDto[];
}