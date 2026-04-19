import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ServiceKeyGuard } from './guards/service-key.guard';

@Global()
@Module({
  providers: [AuthService, ServiceKeyGuard],
  exports: [AuthService, ServiceKeyGuard],
})
export class AuthModule {}