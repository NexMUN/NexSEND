export type AdminSession = {
  authenticated: boolean;
  admin: {
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: string | null;
  };
};

export type SetupStatus = {
  setupComplete: boolean;
};

export type Organization = {
  id: string;
  name: string;
  organizationId: string;
  email: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
};

export type OrganizationList = {
  data: Organization[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type ServiceKey = {
  id: string;
  serviceId: string;
  name: string;
  permissions: Record<string, string[]>;
  webhookUrl: string | null;
  isActive: boolean;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceKeyWithApiKey = ServiceKey & {
  apiKey: string;
};

export type ServiceKeyList = {
  data: ServiceKey[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type DnsRecord = {
  type: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
};

export type DnsRecordDisplay = {
  type: 'required' | 'optional' | 'guidance';
  record: DnsRecord;
  resolvedRecord: DnsRecord;
  variables: Record<string, string>;
  instructions: string;
  checkType?: string;
  needsUpdate: boolean;
};

export type Domain = {
  id: string;
  organizationId: string;
  domain: string;
  isVerified: boolean;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'SUSPENDED';
  isPrimary: boolean;
  verificationMethod: 'DNS_TXT' | 'CNAME';
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DomainDnsResponse = {
  domain: string;
  status: string;
  requiredRecords: DnsRecordDisplay[];
  optionalRecords: DnsRecordDisplay[];
  guidance: {
    spf?: {
      action: string;
      includeValue: string;
      example: string;
      currentSpf?: string | null;
    };
  };
};

export type EmailEvent = {
  id: string;
  eventType: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

export type EmailJob = {
  id: string; // notificationId
  organizationId: string;
  fromEmail: string;
  toEmails: string[] | string;
  status: 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'BOUNCED' | 'COMPLAINED';
  attempts: number;
  maxAttempts: number;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
  organization: {
    name: string;
    organizationId: string;
  };
  serviceKey: {
    name: string;
  };
  events: EmailEvent[];
};

export type EmailLogList = {
  data: EmailJob[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};
