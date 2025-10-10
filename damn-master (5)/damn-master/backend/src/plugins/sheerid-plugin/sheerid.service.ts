import { Injectable, Inject } from '@nestjs/common';
import { CustomerService, RequestContext, Logger, ChannelService } from '@vendure/core';
import {
  SheerIdPluginOptions,
  WebhookProcessingResult,
  CustomerVerificationData,
  SheerIdTokenResponse,
  CachedToken
} from './types.js';

@Injectable()
export class SheerIdService {
  private readonly loggerCtx = 'SheerIdService';
  private cachedToken: CachedToken | null = null;

  constructor(
    private customerService: CustomerService,
    private channelService: ChannelService,
    @Inject('SHEERID_PLUGIN_OPTIONS') private options: SheerIdPluginOptions
  ) {}

  /**
   * Get a valid access token using OAuth Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    Logger.info('Requesting new SheerID access token', this.loggerCtx);

    const response = await fetch('https://auth.sheerid.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        audience: 'https://services.sheerid.com/rest/'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json() as SheerIdTokenResponse;

    // Cache the token with a safety margin (expire 5 minutes early)
    const expiresAt = Date.now() + (tokenData.expires_in * 1000) - (5 * 60 * 1000);
    this.cachedToken = {
      token: tokenData.access_token,
      expiresAt
    };

    Logger.info(`Successfully obtained SheerID access token, expires in ${tokenData.expires_in} seconds`, this.loggerCtx);

    return tokenData.access_token;
  }

  /**
   * Get verification details from SheerID API (includes customer personal information)
   */
  private async getVerificationDetails(verificationId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`https://services.sheerid.com/rest/v2/verification/${verificationId}/details`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get verification details: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * PUBLIC METHOD: Test what customer data is available in SheerID API
   */
  async testVerificationDetails(verificationId: string): Promise<any> {
    try {
      Logger.info(`=== TESTING COMPLETE VERIFICATION DETAILS ===`, this.loggerCtx);
      Logger.info(`Verification ID: ${verificationId}`, this.loggerCtx);

      const details = await this.getVerificationDetails(verificationId);

      Logger.info(`Complete API Response:`, this.loggerCtx);
      Logger.info(`${JSON.stringify(details, null, 2)}`, this.loggerCtx);
      Logger.info(`=== END TEST ===`, this.loggerCtx);

      return details;
    } catch (error) {
      Logger.error(`Failed to test verification details: ${error}`, String(error), this.loggerCtx);
      throw error;
    }
  }

  /**
   * PUBLIC METHOD: Clear customer verification data for testing
   */
  async clearCustomerVerification(customerId: string): Promise<any> {
    try {
      Logger.info(`Clearing verification data for customer: ${customerId}`, this.loggerCtx);

      // Create admin context for customer operations
      const defaultChannel = await this.channelService.getDefaultChannel();
      const ctx = new RequestContext({
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        channel: defaultChannel,
      });

      // Update customer record to clear verification data
      await this.customerService.update(ctx, {
        id: customerId,
        customFields: {
          sheerIdVerifications: '[]',
          activeVerifications: [],
          verificationMetadata: '{}'
        }
      });

      Logger.info(`Verification data cleared for customer: ${customerId}`, this.loggerCtx);
      return { customerId, status: 'cleared' };
    } catch (error) {
      Logger.error(`Failed to clear verification data: ${error}`, String(error), this.loggerCtx);
      throw error;
    }
  }

  /**
   * Handle incoming webhook from SheerID using metadata-driven approach
   */
  async handleVerificationWebhook(verificationId: string): Promise<WebhookProcessingResult> {
    try {
      Logger.info(`Processing SheerID webhook for verification: ${verificationId}`, this.loggerCtx);

      // Get verification details from SheerID API
      const verificationDetails = await this.getVerificationDetails(verificationId);
      Logger.info(`=== VERIFICATION DETAILS ===`, this.loggerCtx);
      Logger.info(`${JSON.stringify(verificationDetails, null, 2)}`, this.loggerCtx);
      Logger.info(`=== END VERIFICATION DETAILS ===`, this.loggerCtx);

      // Extract customer information from verification details
      const lastResponse = verificationDetails.lastResponse;
      const personInfo = verificationDetails.personInfo;
      const customerId = personInfo?.metadata?.customerId;

      if (!lastResponse) {
        throw new Error('lastResponse is missing from SheerID verification details');
      }

      // Handle the actual SheerID API response structure
      const currentStep = lastResponse.currentStep;
      const segment = lastResponse.segment;


      if (!currentStep) {
        throw new Error('currentStep is missing from SheerID API response');
      }

      // Map SheerID segments to our program configuration
      const segmentMapping = {
        'military': { programId: 'military', category: 'military', discountPercent: 20 },
        'first_responder': { programId: 'first_responder', category: 'first_responder', discountPercent: 20 },
        'teacher': { programId: 'teacher', category: 'teacher', discountPercent: 15 },
        'student': { programId: 'student', category: 'student', discountPercent: 15 },
        'medical': { programId: 'medical', category: 'medical', discountPercent: 20 },
        'healthcare': { programId: 'medical', category: 'medical', discountPercent: 20 }, // Alternative segment name
        'senior': { programId: 'senior', category: 'senior', discountPercent: 15 }
      };

      const programConfig = segmentMapping[segment as keyof typeof segmentMapping];

      if (!programConfig) {
        Logger.warn(`Unknown SheerID segment: ${segment}. Available segments: ${Object.keys(segmentMapping).join(', ')}`, this.loggerCtx);
        // Don't fallback to military - instead, try to infer from subSegment or fail gracefully
        throw new Error(`Unsupported verification segment: ${segment}`);
      }
      const { programId, category, discountPercent } = programConfig;

      // Check if we have customer ID from metadata
      if (!customerId || customerId === 'anonymous') {
        Logger.warn(`Customer ID not available in verification metadata - verification processed but not linked to customer account. CustomerId: ${customerId}`, this.loggerCtx);
        return {
          success: true,
          status: 'skipped'
        };
      }

      Logger.info(`Processing verification for customer: ${customerId}, category: ${category}`, this.loggerCtx);

      // Create admin context for customer operations
      const defaultChannel = await this.channelService.getDefaultChannel();
      const ctx = new RequestContext({
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        channel: defaultChannel,
      });

      const customer = await this.customerService.findOne(ctx, customerId);

      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      // Parse existing verification data
      let existingVerifications: CustomerVerificationData[] = [];
      let activeVerifications: string[] = [];
      let verificationMetadata: Record<string, any> = {};

      try {
        existingVerifications = JSON.parse((customer.customFields as any)?.sheerIdVerifications || '[]');
        activeVerifications = (customer.customFields as any)?.activeVerifications || [];
        verificationMetadata = JSON.parse((customer.customFields as any)?.verificationMetadata || '{}');
      } catch (e) {
        Logger.error('Error parsing existing verification data:', String(e), this.loggerCtx);
      }

      if (currentStep === 'success') {
        Logger.info(`Verification successful for customer ${customerId}, category: ${category}`, this.loggerCtx);

        // Create verification data
        const verificationData: CustomerVerificationData = {
          programId,
          category,
          verificationId,
          status: 'verified',
          discountPercent: parseInt(discountPercent.toString()),
          verifiedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        };

        // Remove existing verification for same category (replace if exists)
        existingVerifications = existingVerifications.filter((v: any) => v.category !== category);
        existingVerifications.push(verificationData);

        // Update active verifications list
        activeVerifications = activeVerifications.filter((cat: string) => cat !== category);
        activeVerifications.push(category);

        // Update metadata for quick access
        verificationMetadata[category] = {
          discountPercent: verificationData.discountPercent,
          expiresAt: verificationData.expiresAt,
          lastVerified: verificationData.verifiedAt
        };

      } else {
        Logger.info(`Verification failed for customer ${customerId}, category: ${category}`, this.loggerCtx);

        // Remove failed verification
        existingVerifications = existingVerifications.filter((v: any) => v.category !== category);
        activeVerifications = activeVerifications.filter((cat: string) => cat !== category);
        delete verificationMetadata[category];
      }

      // Update customer record
      await this.customerService.update(ctx, {
        id: customerId,
        customFields: {
          sheerIdVerifications: JSON.stringify(existingVerifications),
          activeVerifications,
          verificationMetadata: JSON.stringify(verificationMetadata)
        }
      });

      Logger.info(`Successfully updated customer ${customerId} verification status`, this.loggerCtx);

      return {
        success: true,
        customerId,
        programId,
        category,
        status: currentStep === 'success' ? 'verified' : 'failed',
        discountPercent: currentStep === 'success' ? parseInt(discountPercent.toString()) : undefined
      };

    } catch (error) {
      Logger.error(`Webhook processing failed: ${error}`, String(error), this.loggerCtx);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
