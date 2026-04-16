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
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServiceKeyService } from './service-key.service';
import { CreateServiceKeyDto } from './dto/create-service-key.dto';
import { UpdateServiceKeyDto } from './dto/update-service-key.dto';
import { ServiceKeyResponseDto } from './dto/service-key-response.dto';
import { ServiceKeyWithApiKeyDto } from './dto/service-key-with-api-key.dto';
import { ServiceKeyListResponseDto } from './dto/service-key-list-response.dto';
import { ServiceKeyGuard } from '../auth/guards/service-key.guard';
import { GetServiceKey } from '../auth/decorators/service-key.decorator';
import { ServiceKey } from '@prisma/client';
import { ApiResponseDto } from '../../common/dto/response.dto';
import { API_PREFIX, API_VERSION } from '../../common/constants';

@ApiTags('service-keys')
@ApiHeader({
  name: 'X-Service-Key',
  description: 'Service API key for authentication',
  required: true,
})
@ApiHeader({
  name: 'X-Service-Id',
  description: 'Service ID for identification',
  required: true,
})
@Controller(`${API_PREFIX}/${API_VERSION}/service-keys`)
@UseGuards(ServiceKeyGuard)
export class ServiceKeyController {
  constructor(private readonly serviceKeyService: ServiceKeyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new service key',
    description: 'Generate a new service key with specified permissions and settings',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service key created successfully (API key shown only once)',
    type: ServiceKeyWithApiKeyDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Service key already exists',
  })
  async create(
    @Body() createServiceKeyDto: CreateServiceKeyDto,
    @GetServiceKey() currentServiceKey: ServiceKey,
  ): Promise<ApiResponseDto<ServiceKeyWithApiKeyDto>> {
    // Check if current service key has permission to create service keys
    this.checkAdminPermission(currentServiceKey);

    const serviceKey = await this.serviceKeyService.create(createServiceKeyDto);
    return {
      success: true,
      data: serviceKey,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all service keys',
    description: 'List all service keys with pagination and filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or service ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service keys retrieved successfully',
    type: ServiceKeyListResponseDto,
  })
  async findAll(
    @GetServiceKey() currentServiceKey: ServiceKey,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ): Promise<ApiResponseDto<ServiceKeyListResponseDto>> {
    // Check if current service key has permission to read service keys
    this.checkAdminPermission(currentServiceKey);

    const result = await this.serviceKeyService.findAll(
      page || 1,
      limit || 20,
      isActive,
      search,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get(':serviceId')
  @ApiOperation({
    summary: 'Get service key by ID',
    description: 'Retrieve detailed information about a specific service key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service key retrieved successfully',
    type: ServiceKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service key not found',
  })
  async findOne(
    @Param('serviceId') serviceId: string,
    @GetServiceKey() currentServiceKey: ServiceKey,
  ): Promise<ApiResponseDto<ServiceKeyResponseDto>> {
    // Check if current service key has permission or is requesting its own info
    if (currentServiceKey.serviceId !== serviceId) {
      this.checkAdminPermission(currentServiceKey);
    }

    const serviceKey = await this.serviceKeyService.findOne(serviceId);
    return {
      success: true,
      data: serviceKey,
    };
  }

  @Patch(':serviceId')
  @ApiOperation({
    summary: 'Update service key',
    description: 'Update properties of an existing service key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service key updated successfully',
    type: ServiceKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service key not found',
  })
  async update(
    @Param('serviceId') serviceId: string,
    @Body() updateServiceKeyDto: UpdateServiceKeyDto,
    @GetServiceKey() currentServiceKey: ServiceKey,
  ): Promise<ApiResponseDto<ServiceKeyResponseDto>> {
    // Check if current service key has permission to update service keys
    this.checkAdminPermission(currentServiceKey);

    const updatedServiceKey = await this.serviceKeyService.update(serviceId, updateServiceKeyDto);
    return {
      success: true,
      data: updatedServiceKey,
    };
  }

  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete service key',
    description: 'Soft delete (deactivate) or hard delete a service key',
  })
  @ApiQuery({ 
    name: 'hardDelete', 
    required: false, 
    type: Boolean, 
    description: 'Perform hard delete instead of soft delete' 
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Service key deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service key not found',
  })
  async remove(
    @Param('serviceId') serviceId: string,
    @GetServiceKey() currentServiceKey: ServiceKey,
    @Query('hardDelete', new ParseBoolPipe({ optional: true })) hardDelete?: boolean,
  ): Promise<void> {
    // Check if current service key has permission to delete service keys
    this.checkAdminPermission(currentServiceKey);

    // Prevent self-deletion
    if (currentServiceKey.serviceId === serviceId) {
      throw new Error('Cannot delete your own service key');
    }

    await this.serviceKeyService.remove(serviceId, hardDelete || false);
  }

  @Post(':serviceId/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate API key',
    description: 'Generate a new API key for an existing service (old key becomes invalid)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key regenerated successfully (new key shown only once)',
    type: ServiceKeyWithApiKeyDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service key not found',
  })
  async regenerateApiKey(
    @Param('serviceId') serviceId: string,
    @GetServiceKey() currentServiceKey: ServiceKey,
  ): Promise<ApiResponseDto<ServiceKeyWithApiKeyDto>> {
    // Check if current service key has permission or is regenerating its own key
    if (currentServiceKey.serviceId !== serviceId) {
      this.checkAdminPermission(currentServiceKey);
    }

    const serviceKey = await this.serviceKeyService.regenerateApiKey(serviceId);
    return {
      success: true,
      data: serviceKey,
    };
  }

  @Get(':serviceId/usage')
  @ApiOperation({
    summary: 'Get service key usage statistics',
    description: 'Retrieve usage statistics and analytics for a service key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Service key not found',
  })
  async getUsageStats(
    @Param('serviceId') serviceId: string,
    @GetServiceKey() currentServiceKey: ServiceKey,
  ): Promise<ApiResponseDto<any>> {
    // Check if current service key has permission or is requesting its own stats
    if (currentServiceKey.serviceId !== serviceId) {
      this.checkAdminPermission(currentServiceKey);
    }

    const stats = await this.serviceKeyService.getUsageStats(serviceId);
    return {
      success: true,
      data: stats,
    };
  }

  private checkAdminPermission(serviceKey: ServiceKey): void {
    const permissions = serviceKey.permissions as Record<string, string[]>;
    const serviceKeyPermissions = permissions['service-keys'] || [];
    
    if (!serviceKeyPermissions.includes('*') && !serviceKeyPermissions.includes('manage')) {
      throw new Error('Insufficient permissions to manage service keys');
    }
  }
}