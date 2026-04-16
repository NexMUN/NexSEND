import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SERVICE_KEY_HEADER, SERVICE_ID_HEADER } from '../../../common/constants';
import { ServiceKeyNotFoundException } from '../../../common/exceptions/business.exception';

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  private readonly logger = new Logger(ServiceKeyGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const serviceKey = request.headers[SERVICE_KEY_HEADER.toLowerCase()];
    const serviceId = request.headers[SERVICE_ID_HEADER.toLowerCase()];

    const path = request.url;
    const method = request.method;

    if (!serviceKey) {
      this.logger.warn(`Missing ${SERVICE_KEY_HEADER} header for ${method} ${path}`);
      throw new ServiceKeyNotFoundException('Service key is required');
    }

    if (!serviceId) {
      this.logger.warn(`Missing ${SERVICE_ID_HEADER} header for ${method} ${path}`);
      throw new ServiceKeyNotFoundException('Service ID is required');
    }

    this.logger.log(`Validating service key for ${method} ${path} - Service ID: ${serviceId}`);

    const validatedServiceKey = await this.authService.validateServiceKey(serviceKey, serviceId);

    if (!validatedServiceKey) {
      this.logger.error(`Invalid service key for ${method} ${path} - Service ID: ${serviceId}`);
      throw new ServiceKeyNotFoundException();
    }

    this.logger.log(`Service key validated successfully: ${validatedServiceKey.name} (${serviceId})`);

    // Attach service key to request for later use
    request.serviceKey = validatedServiceKey;

    return true;
  }
}