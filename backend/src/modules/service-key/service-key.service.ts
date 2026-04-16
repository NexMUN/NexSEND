import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceKey } from '@prisma/client';
import * as crypto from 'crypto';
import { CreateServiceKeyDto } from './dto/create-service-key.dto';
import { UpdateServiceKeyDto } from './dto/update-service-key.dto';
import { ServiceKeyResponseDto } from './dto/service-key-response.dto';
import { ServiceKeyWithApiKeyDto } from './dto/service-key-with-api-key.dto';
import { ServiceKeyListResponseDto } from './dto/service-key-list-response.dto';

@Injectable()
export class ServiceKeyService {
  private readonly logger = new Logger(ServiceKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createServiceKeyDto: CreateServiceKeyDto): Promise<ServiceKeyWithApiKeyDto> {
    // Generate service ID and API key
    const serviceId = this.generateServiceId();
    const rawApiKey = this.generateApiKey();
    const hashedApiKey = this.hashApiKey(rawApiKey);

    // Validate permissions format
    this.validatePermissions(createServiceKeyDto.permissions);

    try {
      const serviceKey = await this.prisma.serviceKey.create({
        data: {
          serviceId,
          apiKey: hashedApiKey,
          name: createServiceKeyDto.name,
          permissions: createServiceKeyDto.permissions,
          webhookUrl: createServiceKeyDto.webhookUrl || null,
          isActive: true,
          rateLimitPerHour: createServiceKeyDto.rateLimitPerHour ?? -1,
          rateLimitPerDay: createServiceKeyDto.rateLimitPerDay ?? -1,
          expiresAt: null, // No expiration for infinite validity
        },
      });

      this.logger.log(`Service key created: ${serviceKey.serviceId}`);
      return new ServiceKeyWithApiKeyDto(serviceKey, rawApiKey);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Service key already exists');
      }
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    isActive?: boolean,
    search?: string,
  ): Promise<ServiceKeyListResponseDto> {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serviceId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [serviceKeys, total] = await Promise.all([
      this.prisma.serviceKey.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceKey.count({ where }),
    ]);

    const serviceKeyDtos = serviceKeys.map(sk => new ServiceKeyResponseDto(sk));
    return new ServiceKeyListResponseDto(serviceKeyDtos, page, limit, total);
  }

  async findOne(serviceId: string): Promise<ServiceKeyResponseDto> {
    const serviceKey = await this.prisma.serviceKey.findUnique({
      where: { serviceId },
    });

    if (!serviceKey) {
      throw new NotFoundException('Service key not found');
    }

    return new ServiceKeyResponseDto(serviceKey);
  }

  async update(serviceId: string, updateServiceKeyDto: UpdateServiceKeyDto): Promise<ServiceKeyResponseDto> {
    // Check if service key exists
    const existingServiceKey = await this.prisma.serviceKey.findUnique({
      where: { serviceId },
    });

    if (!existingServiceKey) {
      throw new NotFoundException('Service key not found');
    }

    // Validate permissions if provided
    if (updateServiceKeyDto.permissions) {
      this.validatePermissions(updateServiceKeyDto.permissions);
    }

    const updatedServiceKey = await this.prisma.serviceKey.update({
      where: { serviceId },
      data: {
        ...(updateServiceKeyDto.name && { name: updateServiceKeyDto.name }),
        ...(updateServiceKeyDto.permissions && { permissions: updateServiceKeyDto.permissions }),
        ...(updateServiceKeyDto.webhookUrl !== undefined && { webhookUrl: updateServiceKeyDto.webhookUrl }),
        ...(updateServiceKeyDto.rateLimitPerHour !== undefined && { rateLimitPerHour: updateServiceKeyDto.rateLimitPerHour }),
        ...(updateServiceKeyDto.rateLimitPerDay !== undefined && { rateLimitPerDay: updateServiceKeyDto.rateLimitPerDay }),
        ...(updateServiceKeyDto.isActive !== undefined && { isActive: updateServiceKeyDto.isActive }),
      },
    });

    this.logger.log(`Service key updated: ${serviceId}`);
    return new ServiceKeyResponseDto(updatedServiceKey);
  }

  async remove(serviceId: string, hardDelete: boolean = false): Promise<void> {
    const serviceKey = await this.prisma.serviceKey.findUnique({
      where: { serviceId },
    });

    if (!serviceKey) {
      throw new NotFoundException('Service key not found');
    }

    if (hardDelete) {
      await this.prisma.serviceKey.delete({
        where: { serviceId },
      });
      this.logger.log(`Service key hard deleted: ${serviceId}`);
    } else {
      // Soft delete by marking as inactive
      await this.prisma.serviceKey.update({
        where: { serviceId },
        data: { isActive: false },
      });
      this.logger.log(`Service key soft deleted (deactivated): ${serviceId}`);
    }
  }

  async regenerateApiKey(serviceId: string): Promise<ServiceKeyWithApiKeyDto> {
    const serviceKey = await this.prisma.serviceKey.findUnique({
      where: { serviceId },
    });

    if (!serviceKey) {
      throw new NotFoundException('Service key not found');
    }

    // Generate new API key
    const newRawApiKey = this.generateApiKey();
    const newHashedApiKey = this.hashApiKey(newRawApiKey);

    const updatedServiceKey = await this.prisma.serviceKey.update({
      where: { serviceId },
      data: { 
        apiKey: newHashedApiKey,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`API key regenerated for service: ${serviceId}`);
    return new ServiceKeyWithApiKeyDto(updatedServiceKey, newRawApiKey);
  }

  async getUsageStats(serviceId: string): Promise<any> {
    const serviceKey = await this.prisma.serviceKey.findUnique({
      where: { serviceId },
      include: {
        emailJobs: {
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!serviceKey) {
      throw new NotFoundException('Service key not found');
    }

    const totalJobs = serviceKey.emailJobs.length;
    const jobsByStatus = serviceKey.emailJobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      serviceId,
      totalEmailJobs: totalJobs,
      jobsByStatus,
      lastUsedAt: serviceKey.lastUsedAt,
      isActive: serviceKey.isActive,
    };
  }

  private generateServiceId(): string {
    return `svc_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private validatePermissions(permissions: Record<string, string[]>): void {
    const validResources = ['organizations', 'domains', 'emails', 'service-keys'];
    const validActions = ['*', 'read', 'write', 'create', 'update', 'delete', 'send', 'manage'];

    for (const [resource, actions] of Object.entries(permissions)) {
      if (!validResources.includes(resource)) {
        throw new ConflictException(`Invalid permission resource: ${resource}`);
      }

      for (const action of actions) {
        if (!validActions.includes(action)) {
          throw new ConflictException(`Invalid permission action: ${action} for resource: ${resource}`);
        }
      }
    }
  }
}