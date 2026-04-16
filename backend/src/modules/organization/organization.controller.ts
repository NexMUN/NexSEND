import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { ServiceKeyGuard } from '../auth/guards/service-key.guard';
import { GetServiceKey } from '../auth/decorators/service-key.decorator';
import { ServiceKey } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ApiResponseDto } from '../../common/dto/response.dto';
import { API_PREFIX, API_VERSION } from '../../common/constants';

@ApiTags('organizations')
@ApiHeader({
  name: 'X-Service-Key',
  description: 'Service API key for authentication',
  required: true,
})
@Controller(`${API_PREFIX}/${API_VERSION}/organizations`)
@UseGuards(ServiceKeyGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new organization',
    description: 'Register a new organization in the notification service',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization already exists',
  })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetServiceKey() serviceKey: ServiceKey,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.create(createOrganizationDto);
    return new OrganizationResponseDto(organization);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all organizations',
    description: 'Retrieve a paginated list of all organizations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organizations retrieved successfully',
  })
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.organizationService.findAll(query.page, query.limit);
    return {
      ...result,
      data: result.data.map(org => new OrganizationResponseDto(org)),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieve a specific organization by its ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async findOne(@Param('id') id: string): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.findOne(id);
    return new OrganizationResponseDto(organization);
  }

  @Get('by-org-id/:organizationId')
  @ApiOperation({
    summary: 'Get organization by organizationId',
    description: 'Retrieve a specific organization by its organizationId from main service',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async findByOrganizationId(
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.findByOrganizationId(organizationId);
    return new OrganizationResponseDto(organization);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update organization',
    description: 'Update organization status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.update(id, updateOrganizationDto);
    return new OrganizationResponseDto(organization);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete organization',
    description: 'Soft delete an organization (sets status to DELETED)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.organizationService.remove(id);
  }

  @Post('check-or-create/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if organization exists, create if not',
    description: 'Check if organization exists in database. If not found, create it with provided details.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization found or created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization created successfully (new)',
    type: OrganizationResponseDto,
  })
  async checkOrCreate(
    @Param('organizationId') organizationId: string,
    @Body() createOrganizationDto: CreateOrganizationDto,
    @GetServiceKey() serviceKey: ServiceKey,
  ): Promise<ApiResponseDto<{ organization: OrganizationResponseDto; created: boolean }>> {
    const result = await this.organizationService.checkOrCreate(organizationId, createOrganizationDto);
    return {
      success: true,
      data: {
        organization: new OrganizationResponseDto(result.organization),
        created: result.created,
      },
    };
  }
}