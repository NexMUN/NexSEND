import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization, OrgStatus } from '@prisma/client';
import {
  OrganizationNotFoundException,
  OrganizationSuspendedException,
  BusinessException,
} from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '../../common/constants';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    try {
      // Validate that organizationId is provided
      if (!createOrganizationDto.organizationId) {
        throw new BusinessException(
          'organizationId is required',
          ERROR_CODES.VALIDATION_FAILED,
          400,
        );
      }

      // Check if organization already exists
      const existing = await this.prisma.organization.findUnique({
        where: { organizationId: createOrganizationDto.organizationId },
      });

      if (existing) {
        throw new BusinessException(
          'Organization already exists',
          ERROR_CODES.VALIDATION_FAILED,
          409,
        );
      }

      return await this.prisma.organization.create({
        data: {
          name: createOrganizationDto.name,
          organizationId: createOrganizationDto.organizationId,
          email: createOrganizationDto.email,
          webhookUrl: createOrganizationDto.webhookUrl,
          webhookSecret: createOrganizationDto.webhookSecret,
          settings: createOrganizationDto.settings ?? {},
          metadata: createOrganizationDto.metadata ?? {},
          status: createOrganizationDto.status ?? OrgStatus.ACTIVE,
        },
      });
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error('Error creating organization', error);
      throw new BusinessException(
        'Failed to create organization',
        ERROR_CODES.DATABASE_ERROR,
        500,
      );
    }
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count(),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new OrganizationNotFoundException();
    }

    return organization;
  }

  async findByOrganizationId(organizationId: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { organizationId },
    });

    if (!organization) {
      throw new OrganizationNotFoundException();
    }

    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    try {
      const organization = await this.findOne(id);

      return await this.prisma.organization.update({
        where: { id },
        data: updateOrganizationDto,
      });
    } catch (error) {
      if (error instanceof OrganizationNotFoundException) {
        throw error;
      }
      this.logger.error('Error updating organization', error);
      throw new BusinessException(
        'Failed to update organization',
        ERROR_CODES.DATABASE_ERROR,
        500,
      );
    }
  }

  async validateOrganization(organizationId: string): Promise<Organization> {
    const organization = await this.findByOrganizationId(organizationId);

    if (organization.status === OrgStatus.SUSPENDED) {
      throw new OrganizationSuspendedException();
    }

    if (organization.status === OrgStatus.DELETED) {
      throw new OrganizationNotFoundException('Organization has been deleted');
    }

    return organization;
  }

  async remove(id: string): Promise<Organization> {
    try {
      const organization = await this.findOne(id);

      // Soft delete - just update status
      return await this.prisma.organization.update({
        where: { id },
        data: { status: OrgStatus.DELETED },
      });
    } catch (error) {
      if (error instanceof OrganizationNotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting organization', error);
      throw new BusinessException(
        'Failed to delete organization',
        ERROR_CODES.DATABASE_ERROR,
        500,
      );
    }
  }

  async checkOrCreate(
    organizationId: string,
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<{ organization: Organization; created: boolean }> {
    try {
      // First, try to find existing organization
      const existingOrganization = await this.prisma.organization.findUnique({
        where: { organizationId },
      });

      if (existingOrganization) {
        this.logger.log(`Organization found: ${organizationId}`);
        return {
          organization: existingOrganization,
          created: false,
        };
      }

      // Organization doesn't exist, create it
      this.logger.log(`Organization not found, creating: ${organizationId}`);
      const newOrganization = await this.prisma.organization.create({
        data: {
          ...createOrganizationDto,
          organizationId, // Ensure we use the organizationId from the URL
        },
      });

      return {
        organization: newOrganization,
        created: true,
      };
    } catch (error) {
      this.logger.error(`Error in checkOrCreate for organization ${organizationId}`, error);
      throw new BusinessException(
        'Failed to check or create organization',
        ERROR_CODES.DATABASE_ERROR,
        500,
      );
    }
  }
}