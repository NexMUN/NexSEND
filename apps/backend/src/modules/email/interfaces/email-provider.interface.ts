export interface EmailData {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailResponse {
  messageId: string;
  response: string;
  provider: string;
}

export interface DomainAuthData {
  domain: string;
  subdomain?: string;
  automatic_security?: boolean;
  custom_spf?: boolean;
}

export interface DomainResponse {
  id: string | number;
  domain: string;
  subdomain?: string;
  valid: boolean;
  verificationToken?: string;
  dns?: any;
}

export interface DomainVerificationResult {
  valid: boolean;
  validation_results?: any;
}

export enum EmailProvider {
  SES = 'SES',
}

export interface IEmailProvider {
  readonly providerName: EmailProvider;
  
  /**
   * Send an email using this provider
   */
  sendEmail(emailData: EmailData): Promise<EmailResponse>;
  
  /**
   * Verify API key or credentials
   */
  verifyCredentials(): Promise<boolean>;
  
  /**
   * Create domain authentication for this provider
   */
  createDomainAuthentication?(domainData: DomainAuthData): Promise<DomainResponse>;
  
  /**
   * Validate domain authentication
   */
  validateDomainAuthentication?(domainId: string | number): Promise<DomainVerificationResult>;
  
  /**
   * Get domain authentication details
   */
  getDomainAuthentication?(domainId: string | number): Promise<DomainResponse>;
  
  /**
   * List all domain authentications
   */
  listDomainAuthentications?(): Promise<DomainResponse[]>;
}

export interface EmailProviderConfig {
  primary: EmailProvider;
}
