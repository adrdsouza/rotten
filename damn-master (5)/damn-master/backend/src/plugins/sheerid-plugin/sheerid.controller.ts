import { Controller, Post, Get, Body, Headers, HttpStatus, HttpException, Param } from '@nestjs/common';
import { SheerIdService } from './sheerid.service.js';
import { SheerIdWebhookPayload } from './types.js';
import * as crypto from 'crypto';

@Controller('sheerid')
export class SheerIdController {
  constructor(private sheerIdService: SheerIdService) {}

  @Post('webhook/:programId')
  async handleWebhook(
    @Param('programId') programId: string,
    @Body() payload: SheerIdWebhookPayload,
    @Headers('x-sheerid-signature') signature: string
  ) {
    // TODO: Re-enable signature verification once we get the webhook secret from SheerID
    // Temporarily disabled for testing - REMOVE IN PRODUCTION
    const isTestMode = process.env.SHEERID_WEBHOOK_SECRET === 'your_webhook_secret_here';

    if (!isTestMode) {
      // Verify webhook signature in production
      if (!this.verifySignature(payload, signature)) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
    } else {
      console.log('⚠️  TESTING MODE: Webhook signature verification disabled');
    }

    try {
      const verificationId = payload.verificationId;
      const result = await this.sheerIdService.handleVerificationWebhook(verificationId);
      return { success: true, result };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw new HttpException(
        `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('test-verification/:verificationId')
  async testVerificationDetails(@Param('verificationId') verificationId: string) {
    try {
      const details = await this.sheerIdService.testVerificationDetails(verificationId);
      return { success: true, details };
    } catch (error) {
      throw new HttpException(
        `Failed to get verification details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('clear-verification/:customerId')
  async clearVerification(@Param('customerId') customerId: string) {
    try {
      const result = await this.sheerIdService.clearCustomerVerification(customerId);
      return { success: true, result };
    } catch (error) {
      throw new HttpException(
        `Failed to clear verification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private verifySignature(payload: SheerIdWebhookPayload, signature: string): boolean {
    const secret = process.env.SHEERID_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('No webhook secret configured for SheerID');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
