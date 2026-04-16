export interface DnsRecordDisplay {
  type: 'required' | 'optional' | 'guidance';
  record: {
    type: string;
    name: string;
    value: string;
    ttl?: number;
    priority?: number;
  };
  resolvedRecord: {
    type: string;
    name: string;
    value: string;
    ttl?: number;
    priority?: number;
  };
  variables: {
    [key: string]: string; // e.g., { "VERIFICATION_TOKEN": "abc123" }
  };
  instructions: string;
  checkType?: string; // For linking to verification checks
  needsUpdate?: boolean; // true if record needs to be created/updated, false if already correct
}

export interface DomainVerificationStatus {
  domain: string;
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'PARTIALLY_VERIFIED' | 'VERIFIED' | 'FAILED';
  checks: DomainCheckStatus[];
}

export interface DomainCheckStatus {
  type: string;
  name: string;
  status: 'PENDING' | 'CHECKING' | 'PASSED' | 'FAILED' | 'WARNING';
  expectedValue: string;
  actualValue?: string | null;
  errorMessage?: string | null;
  lastCheckedAt?: Date | null;
}

export interface SpfGuidance {
  action: string;
  includeValue: string;
  example: string;
  currentSpf?: string | null;
}

export interface DnsRecordsResponse {
  domain: string;
  status: string;
  requiredRecords: DnsRecordDisplay[];
  optionalRecords: DnsRecordDisplay[];
  guidance: {
    spf?: SpfGuidance;
  };
}