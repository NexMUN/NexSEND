import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns the current health status of the notification service',
    operationId: 'healthCheck'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status',
    type: HealthResponseDto
  })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'notification-backend',
      uptime: process.uptime(),
    };
  }
}