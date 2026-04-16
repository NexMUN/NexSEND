import { Injectable, Logger } from '@nestjs/common';
import { Resolver } from 'dns';

@Injectable()
export class DnsLookupService {
  private readonly logger = new Logger(DnsLookupService.name);
  private resolver: Resolver;

  constructor() {
    // Use Google Public DNS to avoid local DNS caching issues
    this.resolver = new Resolver();
    this.resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  }

  async lookupTxtRecords(hostname: string): Promise<string[]> {
    return new Promise((resolve) => {
      this.resolver.resolveTxt(hostname, (err, records) => {
        if (err) {
          this.logger.debug(`TXT lookup failed for ${hostname}: ${err.message}`);
          resolve([]);
        } else {
          // TXT records come as arrays of strings, flatten them
          resolve(records.map(record => record.join('')));
        }
      });
    });
  }

  async lookupCnameRecord(hostname: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolver.resolveCname(hostname, (err, cname) => {
        if (err) {
          this.logger.debug(`CNAME lookup failed for ${hostname}: ${err.message}`);
          resolve(null);
        } else {
          resolve(cname[0] || null);
        }
      });
    });
  }

  async lookupMxRecords(hostname: string): Promise<Array<{ priority: number; exchange: string }>> {
    return new Promise((resolve) => {
      this.resolver.resolveMx(hostname, (err, records) => {
        if (err) {
          this.logger.debug(`MX lookup failed for ${hostname}: ${err.message}`);
          resolve([]);
        } else {
          resolve(records);
        }
      });
    });
  }

  async lookupSpfRecord(domain: string): Promise<string | null> {
    const txtRecords = await this.lookupTxtRecords(domain);
    const spfRecord = txtRecords.find(record => record.startsWith('v=spf1'));
    return spfRecord || null;
  }

  async verifyTxtRecord(hostname: string, expectedValue: string): Promise<boolean> {
    const records = await this.lookupTxtRecords(hostname);
    return records.some(record => record === expectedValue);
  }

  async verifyCnameRecord(hostname: string, expectedValue: string): Promise<boolean> {
    const cname = await this.lookupCnameRecord(hostname);
    return cname === expectedValue;
  }
}