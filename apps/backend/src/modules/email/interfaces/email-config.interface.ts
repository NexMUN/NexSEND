export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized?: boolean;
  };
}

export interface EmailConfig {
  smtp: SmtpConfig;
  defaultFrom: string;
  defaultReplyTo?: string;
}

export interface EmailJobData {
  id: string;
  organizationId: string;
  to: string;
  from?: string;      // e.g., "support", "hello", "no-reply"
  fromName?: string;  // Display name e.g., "Support Team", "Hello Team"
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  priority?: string;
  attempt?: number;
}