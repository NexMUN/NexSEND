import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DomainService } from './domain.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { DomainResponseDto, DnsRecordsResponseDto } from './dto/domain-response.dto';
import { ServiceKeyGuard } from '../auth/guards/service-key.guard';
import { ApiResponseDto } from '../../common/dto/response.dto';
import { DomainVerificationStatus } from './interfaces/dns-record-display.interface';

@ApiTags('Domains')
@Controller('internal/v1/organizations/:organizationId/domains')
@UseGuards(ServiceKeyGuard)
@ApiBearerAuth('service-key')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Post()
  @ApiOperation({ summary: 'Register new domain for organization' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Domain created successfully',
    type: DomainResponseDto,
  })
  async createDomain(
    @Param('organizationId') organizationId: string,
    @Body() createDomainDto: CreateDomainDto,
  ): Promise<ApiResponseDto<DomainResponseDto>> {
    const result = await this.domainService.createDomain(organizationId, createDomainDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List organization domains' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domains retrieved successfully',
    type: [DomainResponseDto],
  })
  async getDomains(
    @Param('organizationId') organizationId: string,
  ): Promise<ApiResponseDto<DomainResponseDto[]>> {
    const result = await this.domainService.getDomains(organizationId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':domainId')
  @ApiOperation({ summary: 'Get domain by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain retrieved successfully',
    type: DomainResponseDto,
  })
  async getDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ): Promise<ApiResponseDto<DomainResponseDto>> {
    const result = await this.domainService.getDomainById(organizationId, domainId);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':domainId')
  @ApiOperation({ summary: 'Update domain settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain updated successfully',
    type: DomainResponseDto,
  })
  async updateDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
    @Body() updateDomainDto: UpdateDomainDto,
  ): Promise<ApiResponseDto<DomainResponseDto>> {
    const result = await this.domainService.updateDomain(organizationId, domainId, updateDomainDto);
    return {
      success: true,
      data: result,
    };
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Remove domain' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain deleted successfully',
    type: DomainResponseDto,
  })
  async deleteDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ): Promise<ApiResponseDto<DomainResponseDto>> {
    const deletedDomain = await this.domainService.deleteDomain(organizationId, domainId);
    return {
      success: true,
      data: deletedDomain,
    };
  }

  @Get(':domainId/dns-records')
  @ApiOperation({ summary: 'Get required DNS records for domain' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'DNS records retrieved successfully',
    type: DnsRecordsResponseDto,
  })
  async getDnsRecords(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ): Promise<ApiResponseDto<DnsRecordsResponseDto>> {
    const result = await this.domainService.getDnsRecords(organizationId, domainId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':domainId/verification-status')
  @ApiOperation({ summary: 'Get domain verification status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification status retrieved successfully',
  })
  async getVerificationStatus(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ): Promise<ApiResponseDto<DomainVerificationStatus>> {
    const result = await this.domainService.getVerificationStatus(organizationId, domainId);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':domainId/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger domain verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain verification completed',
    type: DomainResponseDto,
  })
  async verifyDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ): Promise<ApiResponseDto<DomainResponseDto>> {
    const result = await this.domainService.verifyDomain(organizationId, domainId);
    return {
      success: true,
      data: result,
    };
  }
}