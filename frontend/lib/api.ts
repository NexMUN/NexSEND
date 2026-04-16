import {
  type AdminSession,
  type SetupStatus,
  type Organization,
  type OrganizationList,
  type ServiceKeyList,
  type ServiceKeyWithApiKey,
  type ServiceKey,
  type Domain,
  type DomainDnsResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001/api';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type RawServiceKeyList = {
  serviceKeys: ServiceKey[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      if (payload.message) message = payload.message;
      if (payload.error) message = payload.error;
    } catch {
      // ignore JSON parsing failures
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as T | ApiEnvelope<T>;
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as ApiEnvelope<T>).success === true &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export const api = {
  setupStatus: () => request<SetupStatus>('/internal/v1/admin/setup-status'),
  setup: (email: string, password: string) =>
    request<{ success: boolean }>('/internal/v1/admin/setup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ success: boolean }>('/internal/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<{ success: boolean }>('/internal/v1/admin/logout', {
      method: 'POST',
    }),
  session: () => request<AdminSession>('/internal/v1/admin/session'),

  organizations: {
    list: () => request<OrganizationList>('/internal/v1/admin/organizations?page=1&limit=100'),
    create: (payload: Pick<Organization, 'name' | 'organizationId' | 'email'>) =>
      request<Organization>('/internal/v1/admin/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Pick<Organization, 'name' | 'email' | 'status'>>) =>
      request<Organization>(`/internal/v1/admin/organizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      request<void>(`/internal/v1/admin/organizations/${id}`, {
        method: 'DELETE',
      }),
  },

  serviceKeys: {
    list: async () => {
      const payload = await request<RawServiceKeyList | ServiceKeyList>(
        '/internal/v1/admin/service-keys?page=1&limit=100',
      );
      if ('serviceKeys' in payload && 'pagination' in payload) {
        return {
          data: payload.serviceKeys,
          ...payload.pagination,
        } satisfies ServiceKeyList;
      }
      return payload;
    },
    create: (payload: {
      name: string;
      permissions: Record<string, string[]>;
      webhookUrl?: string;
      rateLimitPerHour?: number;
      rateLimitPerDay?: number;
    }) =>
      request<ServiceKeyWithApiKey>('/internal/v1/admin/service-keys', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (serviceId: string, payload: Partial<Pick<ServiceKey, 'name' | 'isActive' | 'webhookUrl'>>) =>
      request<ServiceKey>(`/internal/v1/admin/service-keys/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    remove: (serviceId: string, hardDelete = false) =>
      request<void>(`/internal/v1/admin/service-keys/${serviceId}?hardDelete=${hardDelete ? 'true' : 'false'}`, {
        method: 'DELETE',
      }),
  },

  domains: {
    list: (organizationId: string) =>
      request<Domain[]>(`/internal/v1/admin/organizations/${organizationId}/domains`),
    create: (organizationId: string, payload: { domain: string; isPrimary: boolean }) =>
      request<Domain>(`/internal/v1/admin/organizations/${organizationId}/domains`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    dnsRecords: (organizationId: string, domainId: string) =>
      request<DomainDnsResponse>(
        `/internal/v1/admin/organizations/${organizationId}/domains/${domainId}/dns-records`
      ),
    verify: (organizationId: string, domainId: string) =>
      request<Domain>(`/internal/v1/admin/organizations/${organizationId}/domains/${domainId}/verify`, {
        method: 'POST',
      }),
  },

  emailLogs: {
    list: (params: { page?: number; limit?: number; organizationId?: string; status?: string }) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.organizationId && params.organizationId !== 'all') searchParams.set('organizationId', params.organizationId);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      return request<import('./types').EmailLogList>(`/internal/v1/admin/email-logs?${searchParams.toString()}`);
    }
  },
};
