import axios from 'axios';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';

export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  reasons?: string[];
}

export interface RecaptchaVerificationOptions {
  secretKey?: string; // For standard API
  minScore?: number;
  expectedAction?: string;
  timeout?: number;
  enterprise?: boolean; // Use Enterprise API
  projectId?: string; // For Enterprise
  siteKey?: string; // For Enterprise
}

export interface EnterpriseAssessmentOptions {
  projectId: string;
  siteKey: string;
  token: string;
  expectedAction: string;
  minScore?: number;
}

/**
 * Verify reCAPTCHA v3 token with Google's API (standard or Enterprise)
 */
export async function verifyRecaptchaToken(
  token: string,
  options: RecaptchaVerificationOptions
): Promise<RecaptchaVerificationResult> {
  const {
    secretKey,
    minScore = 0.5,
    expectedAction,
    timeout = 5000,
    enterprise = false, // Default to standard API
    projectId,
    siteKey
  } = options;

  if (!token) {
    return {
      success: false,
      error_codes: ['missing-input-response']
    };
  }

  // Use Enterprise API if configured
  if (enterprise && projectId && siteKey) {
    return createRecaptchaAssessment({
      projectId,
      siteKey,
      token,
      expectedAction: expectedAction || 'UNKNOWN',
      minScore
    });
  }

  // Fallback to standard API
  if (!secretKey) {
    console.error('reCAPTCHA secret key not configured');
    return {
      success: false,
      error_codes: ['missing-input-secret']
    };
  }

  try {
    // Standard reCAPTCHA v3 verification
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: secretKey,
        response: token
      }),
      {
        timeout,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const result: RecaptchaVerificationResult = response.data;

    // Additional validation for v3
    if (result.success) {
      // Check score threshold
      if (result.score !== undefined && result.score < minScore) {
        console.warn(`reCAPTCHA score ${result.score} below threshold ${minScore}`);
        return {
          ...result,
          success: false,
          error_codes: ['low-score']
        };
      }

      // Check action if specified
      if (expectedAction && result.action !== expectedAction) {
        console.warn(`reCAPTCHA action mismatch: expected ${expectedAction}, got ${result.action}`);
        return {
          ...result,
          success: false,
          error_codes: ['action-mismatch']
        };
      }
    }

    return result;

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    
    // Return success in case of network issues to avoid blocking legitimate users
    // In production, you might want to implement fallback verification
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      console.warn('reCAPTCHA verification timed out, allowing request');
      return { success: true }; // Graceful degradation
    }

    return {
      success: false,
      error_codes: ['network-error']
    };
  }
}

/**
 * Create a reCAPTCHA verification middleware for specific actions
 * Supports both standard and Enterprise reCAPTCHA
 */
export function createRecaptchaMiddleware(action: string, minScore?: number) {
  return async (token: string): Promise<boolean> => {
    // Try standard API first (most common setup)
    const secretKey = process.env.RECAPTCHA_V3_SECRET_KEY;
    if (secretKey) {
      const result = await verifyRecaptchaToken(token, {
        enterprise: false,
        secretKey,
        expectedAction: action,
        minScore: minScore || Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5,
        timeout: Number(process.env.RECAPTCHA_TIMEOUT) || 5000
      });
      return result.success;
    }

    // Fallback to Enterprise if configured
    const projectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID;
    const siteKey = process.env.RECAPTCHA_ENTERPRISE_SITE_KEY;
    
    if (projectId && siteKey) {
      // Use Enterprise API
      const result = await verifyRecaptchaToken(token, {
        enterprise: true,
        projectId,
        siteKey,
        expectedAction: action,
        minScore: minScore || Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5,
        timeout: Number(process.env.RECAPTCHA_TIMEOUT) || 5000
      });
      return result.success;
    }

    // In development, allow without reCAPTCHA
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    throw new Error('reCAPTCHA configuration not found');
  };
}

/**
 * Rate limiting for failed reCAPTCHA attempts
 */
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function trackFailedRecaptcha(identifier: string): boolean {
  const now = Date.now();
  const existing = failedAttempts.get(identifier);
  
  if (!existing) {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset counter if more than 1 hour has passed
  if (now - existing.lastAttempt > 3600000) {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Allow max 10 failed attempts per hour
  existing.count++;
  existing.lastAttempt = now;
  
  return existing.count <= 10;
}

/**
 * Create a reCAPTCHA Enterprise assessment to analyze the risk of a UI action
 * Based on Google Cloud reCAPTCHA Enterprise best practices
 */
export async function createRecaptchaAssessment(
  options: EnterpriseAssessmentOptions
): Promise<RecaptchaVerificationResult> {
  const {
    projectId,
    siteKey,
    token,
    expectedAction,
    minScore = 0.5
  } = options;

  try {
    // Create the reCAPTCHA client
    // TODO: Cache the client generation code (recommended) or call client.close() before exiting the method
    const client = new RecaptchaEnterpriseServiceClient();
    const projectPath = client.projectPath(projectId);

    // Build the assessment request
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: siteKey,
        },
      },
      parent: projectPath,
    };

    const [response] = await client.createAssessment(request);

    // Check if the token is valid
    if (!response.tokenProperties?.valid) {
      console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties?.invalidReason}`);
      return {
        success: false,
        error_codes: ['invalid-token'],
        reasons: [String(response.tokenProperties?.invalidReason) || 'unknown']
      };
    }

    // Check if the expected action was executed
    if (response.tokenProperties?.action !== expectedAction) {
      console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
      return {
        success: false,
        error_codes: ['action-mismatch'],
        action: response.tokenProperties?.action || undefined
      };
    }

    const score = response.riskAnalysis?.score || 0;
    const reasons = response.riskAnalysis?.reasons || [];

    console.log(`The reCAPTCHA score is: ${score}`);
    reasons.forEach((reason) => {
      console.log(`Risk reason: ${reason}`);
    });

    // Check score threshold
    if (score < minScore) {
      console.warn(`reCAPTCHA Enterprise score ${score} below threshold ${minScore}`);
      return {
        success: false,
        score,
        action: response.tokenProperties?.action || undefined,
        error_codes: ['low-score'],
        reasons: reasons.map(String)
      };
    }

    return {
      success: true,
      score,
      action: response.tokenProperties?.action || undefined,
      reasons: reasons.map(String)
    };

  } catch (error) {
    console.error('reCAPTCHA Enterprise assessment error:', error);
    return {
      success: false,
      error_codes: ['enterprise-error'],
      reasons: [error instanceof Error ? error.message : 'Unknown enterprise error']
    };
  }
}
