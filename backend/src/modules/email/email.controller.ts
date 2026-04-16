import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto, SendBulkEmailDto } from './dto/send-email.dto';
import { EmailJobResponseDto, EmailJobListResponseDto } from './dto/email-job.dto';
import { ServiceKeyGuard } from '../auth/guards/service-key.guard';
import { GetServiceKey } from '../auth/decorators/service-key.decorator';
import { ApiResponseDto } from '../../common/dto/response.dto';
import { EmailStatus, ServiceKey } from '@prisma/client';

@ApiTags('Email')
@Controller('internal/v1/organizations/:organizationId/emails')
@UseGuards(ServiceKeyGuard)
@ApiBearerAuth('service-key')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a single email' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Email queued successfully',
    type: ApiResponseDto,
  })
  async sendEmail(
    @Param('organizationId') organizationId: string,
    @Body() sendEmailDto: SendEmailDto,
    @GetServiceKey() serviceKey: ServiceKey,
  ): Promise<ApiResponseDto> {
    const result = await this.emailService.sendEmail(organizationId, sendEmailDto, serviceKey);
    return {
      success: true,
      data: result,
    };
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send multiple emails in bulk' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Bulk emails queued successfully',
    type: ApiResponseDto,
  })
  async sendBulkEmails(
    @Param('organizationId') organizationId: string,
    @Body() sendBulkEmailDto: SendBulkEmailDto,
    @GetServiceKey() serviceKey: ServiceKey,
  ): Promise<ApiResponseDto> {
    const result = await this.emailService.sendBulkEmails(organizationId, sendBulkEmailDto, serviceKey);
    return {
      success: true,
      data: result,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get email jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: EmailStatus })
  @ApiQuery({ name: 'includeSystemEmails', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email jobs retrieved successfully',
    type: EmailJobListResponseDto,
  })
  async getEmailJobs(
    @Param('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: EmailStatus,
    @Query('includeSystemEmails') includeSystemEmails?: boolean,
  ): Promise<ApiResponseDto<EmailJobListResponseDto>> {
    // Convert query params to numbers (they come as strings from HTTP)
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const includeSystem = includeSystemEmails === true || includeSystemEmails === 'true' as any;

    const result = await this.emailService.getEmailJobs(
      organizationId,
      pageNum,
      limitNum,
      status,
      includeSystem,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get email job by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email job retrieved successfully',
    type: EmailJobResponseDto,
  })
  async getEmailJob(
    @Param('organizationId') organizationId: string,
    @Param('jobId') jobId: string,
  ): Promise<ApiResponseDto> {
    const result = await this.emailService.getEmailJob(organizationId, jobId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('jobs/:jobId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry a failed email job' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Email job queued for retry',
    type: ApiResponseDto,
  })
  async retryEmailJob(
    @Param('organizationId') organizationId: string,
    @Param('jobId') jobId: string,
  ): Promise<ApiResponseDto> {
    const result = await this.emailService.retryEmailJob(organizationId, jobId);
    return {
      success: true,
      data: result,
    };
  }
}