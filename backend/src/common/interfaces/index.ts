import { Request } from 'express';
import { ServiceKey } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  serviceKey: ServiceKey;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  timestamp?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ServiceKeyPayload {
  id: string;
  serviceId: string;
  permissions: Record<string, any>;
}