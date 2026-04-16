import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailProvider, EmailProvider, EmailProviderConfig } from '../interfaces/email-provider.interface';
import { SESProvider } from '../providers/ses.provider';

@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);
  private providers = new Map<EmailProvider, IEmailProvider>();
  private providerConfig!: EmailProviderConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly sesProvider: SESProvider,
  ) {
    this.initializeProviders();
    this.loadConfiguration();
  }

  private initializeProviders(): void {
    this.providers.set(EmailProvider.SES, this.sesProvider);
  }

  private loadConfiguration(): void {
    const configuredProvider = this.configService.get<string>('EMAIL_PROVIDER', EmailProvider.SES).toUpperCase();
    const primary = configuredProvider === EmailProvider.SES ? EmailProvider.SES : EmailProvider.SES;

    this.providerConfig = {
      primary,
    };

    if (configuredProvider !== EmailProvider.SES) {
      this.logger.warn(`Unsupported EMAIL_PROVIDER="${configuredProvider}" detected. Forcing SES-only mode.`);
    }
    this.logger.log('Email provider configuration loaded in SES-only mode');
  }

  /**
   * Get the primary email provider
   */
  async getPrimaryProvider(): Promise<IEmailProvider> {
    const provider = this.providers.get(this.providerConfig.primary);
    
    if (!provider) {
      throw new Error(`Primary email provider ${this.providerConfig.primary} is not available`);
    }

    // Verify provider credentials
    const isValid = await this.verifyProvider(provider);
    if (!isValid) {
      this.logger.warn(`Primary provider ${this.providerConfig.primary} credentials are invalid`);
      throw new Error(`Primary provider ${this.providerConfig.primary} is not configured properly`);
    }

    return provider;
  }

  /**
   * Get a specific provider by type
   */
  getProvider(providerType: EmailProvider): IEmailProvider {
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      throw new Error(`Email provider ${providerType} is not available`);
    }

    return provider;
  }

  async getProviderWithFallback(): Promise<IEmailProvider> {
    return this.getPrimaryProvider();
  }

  /**
   * Verify provider credentials without throwing
   */
  private async verifyProvider(provider: IEmailProvider): Promise<boolean> {
    try {
      return await provider.verifyCredentials();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Provider verification failed for ${provider.providerName}:`, errorMessage);
      return false;
    }
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): EmailProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get current configuration
   */
  getConfiguration(): EmailProviderConfig {
    return { ...this.providerConfig };
  }

  /**
   * Update configuration at runtime
   */
  updateConfiguration(config: Partial<EmailProviderConfig>): void {
    this.providerConfig = {
      ...this.providerConfig,
      ...config,
      primary: EmailProvider.SES,
    };

    this.logger.log('Email provider configuration updated in SES-only mode:', this.providerConfig);
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [providerType, provider] of this.providers) {
      results[providerType] = await this.verifyProvider(provider);
    }

    return results;
  }
}
