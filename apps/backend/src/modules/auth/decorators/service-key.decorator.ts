import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ServiceKey } from '@prisma/client';

export const GetServiceKey = createParamDecorator(
  (data: keyof ServiceKey | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const serviceKey = request.serviceKey;

    return data ? serviceKey?.[data] : serviceKey;
  },
);