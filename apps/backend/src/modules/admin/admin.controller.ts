import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from '../organization/organization.service';
import { ServiceKeyService } from '../service-key/service-key.service';
import { DomainService } from '../domain/domain.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminSessionGuard } from '../admin-auth/admin-session.guard';
import { CreateOrganizationDto } from '../organization/dto/create-organization.dto';
import { UpdateOrganizationDto } from '../organization/dto/update-organization.dto';
import { CreateServiceKeyDto } from '../service-key/dto/create-service-key.dto';
import { UpdateServiceKeyDto } from '../service-key/dto/update-service-key.dto';
import { CreateDomainDto } from '../domain/dto/create-domain.dto';
import { UpdateDomainDto } from '../domain/dto/update-domain.dto';

@ApiTags('admin')
@Controller('internal/v1/admin')
@UseGuards(AdminSessionGuard)
export class AdminController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly serviceKeyService: ServiceKeyService,
    private readonly domainService: DomainService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations for dashboard admin' })
  async getOrganizations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    return this.organizationService.findAll(pageNum, limitNum);
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Create organization from dashboard admin' })
  async createOrganization(@Body() body: CreateOrganizationDto) {
    return this.organizationService.create(body);
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Update organization from dashboard admin' })
  async updateOrganization(@Param('id') id: string, @Body() body: UpdateOrganizationDto) {
    return this.organizationService.update(id, body);
  }

  @Delete('organizations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization from dashboard admin' })
  async deleteOrganization(@Param('id') id: string): Promise<void> {
    await this.organizationService.remove(id);
  }

  @Get('service-keys')
  @ApiOperation({ summary: 'List service keys for dashboard admin' })
  async getServiceKeys(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const isActiveFilter = isActive === undefined ? undefined : isActive === 'true';
    const result = await this.serviceKeyService.findAll(pageNum, limitNum, isActiveFilter, search);
    return {
      data: result.serviceKeys,
      ...result.pagination,
    };
  }

  @Post('service-keys')
  @ApiOperation({ summary: 'Create service key from dashboard admin' })
  async createServiceKey(@Body() body: CreateServiceKeyDto) {
    return this.serviceKeyService.create(body);
  }

  @Patch('service-keys/:serviceId')
  @ApiOperation({ summary: 'Update service key from dashboard admin' })
  async updateServiceKey(@Param('serviceId') serviceId: string, @Body() body: UpdateServiceKeyDto) {
    return this.serviceKeyService.update(serviceId, body);
  }

  @Delete('service-keys/:serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete service key from dashboard admin' })
  async deleteServiceKey(
    @Param('serviceId') serviceId: string,
    @Query('hardDelete') hardDelete?: string,
  ): Promise<void> {
    await this.serviceKeyService.remove(serviceId, hardDelete === 'true');
  }

  @Post('service-keys/:serviceId/regenerate')
  @ApiOperation({ summary: 'Regenerate service key from dashboard admin' })
  async regenerateServiceKey(@Param('serviceId') serviceId: string) {
    return this.serviceKeyService.regenerateApiKey(serviceId);
  }

  @Get('organizations/:organizationId/domains')
  @ApiOperation({ summary: 'List domains by organizationId from dashboard admin' })
  async getDomains(@Param('organizationId') organizationId: string) {
    return this.domainService.getDomains(organizationId);
  }

  @Post('organizations/:organizationId/domains')
  @ApiOperation({ summary: 'Create domain from dashboard admin' })
  async createDomain(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateDomainDto,
  ) {
    return this.domainService.createDomain(organizationId, body);
  }

  @Patch('organizations/:organizationId/domains/:domainId')
  @ApiOperation({ summary: 'Update domain from dashboard admin' })
  async updateDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
    @Body() body: UpdateDomainDto,
  ) {
    return this.domainService.updateDomain(organizationId, domainId, body);
  }

  @Delete('organizations/:organizationId/domains/:domainId')
  @ApiOperation({ summary: 'Delete domain from dashboard admin' })
  async deleteDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.domainService.deleteDomain(organizationId, domainId);
  }

  @Get('organizations/:organizationId/domains/:domainId/dns-records')
  @ApiOperation({ summary: 'Get DNS records for domain from dashboard admin' })
  async getDnsRecords(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.domainService.getDnsRecords(organizationId, domainId);
  }

  @Get('organizations/:organizationId/domains/:domainId/verification-status')
  @ApiOperation({ summary: 'Get domain verification status from dashboard admin' })
  async getVerificationStatus(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.domainService.getVerificationStatus(organizationId, domainId);
  }

  @Post('organizations/:organizationId/domains/:domainId/verify')
  @ApiOperation({ summary: 'Trigger domain verification from dashboard admin' })
  async verifyDomain(
    @Param('organizationId') organizationId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.domainService.verifyDomain(organizationId, domainId);
  }

  @Get('email-logs')
  @ApiOperation({ summary: 'List email job logs for dashboard admin' })
  async getEmailLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, string> = {};
    if (organizationId && organizationId !== 'all') {
      where.organizationId = organizationId;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.emailJob.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { name: true, organizationId: true } },
          serviceKey: { select: { name: true } },
          events: { orderBy: { timestamp: 'desc' } },
        },
      }),
      this.prisma.emailJob.count({ where }),
    ]);

    return {
      data: logs,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: skip + limitNum < total,
      hasPrevious: pageNum > 1,
    };
  }
}
