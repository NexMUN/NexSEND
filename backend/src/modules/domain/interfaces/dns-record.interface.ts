export interface DnsRecordConfig {
  domain: string;
  verificationToken: string;
  dkimSelector?: string;
  dkimPublicKey?: string;
  fallbackDomain: string;
}

export interface DnsRecord {
  type: 'TXT' | 'MX' | 'CNAME' | 'SPF';
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}