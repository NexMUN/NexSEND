import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceKey } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  ServiceKeyExpiredException,
  ServiceKeyInactiveException,
} from '../../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateServiceKey(apiKey: string, serviceId?: string): Promise<ServiceKey | null> {
    try {
      // Hash the provided API key
      const hashedApiKey = await this.hashApiKey(apiKey);

      // Find service key by hashed value and optionally by service ID
      const serviceKey = await this.prisma.serviceKey.findUnique({
        where: { apiKey: hashedApiKey },
      });

      if (!serviceKey) {
        return null;
      }

      // If service ID is provided, validate it matches
      if (serviceId && serviceKey.serviceId !== serviceId) {
        this.logger.warn(`Service ID mismatch: provided ${serviceId}, expected ${serviceKey.serviceId}`);
        return null;
      }

      // Check if service key is active
      if (!serviceKey.isActive) {
        throw new ServiceKeyInactiveException();
      }

      // Check if service key has expired
      if (serviceKey.expiresAt && new Date() > serviceKey.expiresAt) {
        throw new ServiceKeyExpiredException();
      }

      // Update last used timestamp
      await this.prisma.serviceKey.update({
        where: { id: serviceKey.id },
        data: { lastUsedAt: new Date() },
      });

      return serviceKey;
    } catch (error) {
      if (error instanceof ServiceKeyExpiredException || 
          error instanceof ServiceKeyInactiveException) {
        throw error;
      }
      
      this.logger.error('Error validating service key', error);
      return null;
    }
  }

  async checkRateLimit(serviceKeyId: string): Promise<boolean> {
    // TODO: Implement rate limiting logic with Redis
    // For now, return true to allow all requests
    return true;
  }

  private async hashApiKey(apiKey: string): Promise<string> {
    // Use SHA256 for consistent hashing (not bcrypt which generates different hashes)
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}