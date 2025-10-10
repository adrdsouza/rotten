/**
 * Simplified SheerID Plugin Types
 * Based on SheerID's recommended metadata-driven architecture
 */

export interface SheerIdPluginOptions {
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
}

export interface SheerIdWebhookPayload {
  verificationId: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  customerId?: string;
  programId?: string;
  category?: string;
  status?: 'verified' | 'failed' | 'skipped';
  discountPercent?: number;
  error?: string;
}

export interface VerificationMetadata {
  programId: string;
  category: string;
  discountPercent: number;
  customerId: string;
}

export interface CustomerVerificationData {
  programId: string;
  category: string;
  verificationId: string;
  status: 'verified';
  discountPercent: number;
  verifiedAt: string;
  expiresAt: string;
}

export interface SheerIdTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

export interface CachedToken {
  token: string;
  expiresAt: number;
}
