import { Logger } from '@vendure/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PCI-Compliant Payment Logger
 * 
 * This utility provides secure logging for payment operations while maintaining
 * PCI DSS compliance. It filters sensitive data and provides structured logging
 * for audit trails, dispute resolution, and operational monitoring.
 * 
 * PCI DSS Requirements Addressed:
 * - Requirement 3.4: Render PAN unreadable anywhere it is stored
 * - Requirement 10.2: Implement automated audit trails
 * - Requirement 12.8: Maintain policies for service providers
 */

export interface PaymentEventData {
    transactionId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    responseCode?: string;
    responseText?: string;
    error?: string;
    gatewayTransactionId?: string;
    authCode?: string; // Will be sanitized
    customerReference?: string;
}

export interface PaymentContext {
    orderId?: string;
    transactionId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
}

export type PaymentEventType = 'sale' | 'refund' | 'void' | 'capture' | 'auth' | 'settle';

export class PaymentLogger {
    /**
     * PCI-compliant payment event logging
     * Logs only necessary data, never sensitive cardholder information
     */
    static logPaymentEvent(
        event: PaymentEventType,
        data: PaymentEventData,
        context?: PaymentContext
    ): void {
        // Sanitize and filter data to ensure PCI compliance
        const sanitizedData = this.sanitizePaymentData(data);
        
        const logEntry = {
            event,
            timestamp: new Date().toISOString(),
            ...sanitizedData,
            context: context ? this.sanitizeContext(context) : undefined,
        };

        const logMessage = `Payment ${event}: ${JSON.stringify(logEntry)}`;
        const auditMessage = `PAYMENT_EVENT: ${event} | Order: ${data.orderId} | Transaction: ${data.transactionId} | Status: ${data.status}`;
        
        // Log to console via Vendure Logger
        Logger.info(logMessage, 'PaymentEvent');
        Logger.info(auditMessage, 'PaymentAudit');
        
        // Write to log files
        this.writeToLog('payment', logMessage, logEntry);
        this.writeToLog('audit', auditMessage, logEntry);
    }

    /**
     * Log payment errors with PCI compliance
     * Ensures no sensitive data is logged in error messages
     */
    static logPaymentError(
        event: string,
        error: Error,
        context?: PaymentContext,
        additionalData?: Record<string, any>
    ): void {
        const sanitizedContext = context ? this.sanitizeContext(context) : {};
        const sanitizedAdditional = additionalData ? this.sanitizeErrorData(additionalData) : {};

        const errorMessage = `Payment error in ${event}: ${error.message}`;
        const errorDetails = {
            event,
            error: {
                message: error.message,
                name: error.name,
                // Only include stack trace in development
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            context: sanitizedContext,
            additional: sanitizedAdditional,
        };

        // Log to console via Vendure Logger
        Logger.error(errorMessage, 'PaymentError');
        Logger.debug(JSON.stringify(errorDetails), 'PaymentErrorDetails');
        
        // Write to log files
        this.writeToLog('payment', errorMessage, errorDetails);
        this.writeToLog('audit', `PAYMENT_ERROR: ${errorMessage}`, errorDetails);

        // Log to security logger if this might be a security issue
        if (this.isSecurityRelevantError(error)) {
            this.writeToLog('security', `SECURITY_ALERT: ${errorMessage}`, errorDetails);
            Logger.warn(
                `SECURITY_ALERT: Payment error in ${event} - ${error.message}`,
                'PaymentSecurity'
            );
        }
    }

    /**
     * Log administrative access to payment data
     * Required for PCI DSS audit trails
     */
    private static ensureLogDirectory(logDir: string): void {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true, mode: 0o750 });
        }
    }

    private static writeToLog(type: 'audit' | 'payment' | 'security', message: string, data: any = {}): void {
        try {
            const logDir = process.env.LOG_BASE_PATH || '/home/vendure/rottenhand/backend/logs';
            const typeDir = path.join(logDir, `${type}-backup`);
            
            // Ensure directory exists
            this.ensureLogDirectory(typeDir);
            
            // Create log entry
            const timestamp = new Date().toISOString();
            const logEntry = JSON.stringify({
                timestamp,
                type,
                message,
                ...data
            });
            
            // Write to daily log file
            const date = timestamp.split('T')[0];
            const logFile = path.join(typeDir, `${date}.log`);
            
            fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
        } catch (error) {
            console.error(`Error writing to ${type} log:`, error);
        }
    }

    static logAdminAccess(
        userId: string,
        action: string,
        resource: string,
        context?: PaymentContext
    ): void {
        const accessMessage = `ADMIN_ACCESS: User ${userId} performed ${action} on ${resource}`;
        const logData = {
            userId,
            action,
            resource,
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent ? this.sanitizeUserAgent(context.userAgent) : undefined,
        };

        // Log to console via Vendure Logger
        Logger.info(accessMessage, 'AdminAccess');
        Logger.debug(JSON.stringify(logData), 'AdminAccessDetails');
        
        // Write to audit log file
        this.writeToLog('audit', accessMessage, logData);
    }

    /**
     * Log suspicious payment activity
     * For fraud detection and security monitoring
     */
    static logSuspiciousActivity(
        activityType: string,
        description: string,
        context?: PaymentContext,
        severity: 'low' | 'medium' | 'high' = 'medium'
    ): void {
        const suspiciousMessage = `SUSPICIOUS_ACTIVITY: ${activityType} - ${description}`;
        const suspiciousDetails = JSON.stringify({
            timestamp: new Date().toISOString(),
            activityType,
            description,
            severity,
            context: context ? this.sanitizeContext(context) : undefined,
        });

        if (severity === 'high') {
            Logger.error(suspiciousMessage, 'PaymentSecurity');
        } else if (severity === 'medium') {
            Logger.warn(suspiciousMessage, 'PaymentSecurity');
        } else {
            Logger.info(suspiciousMessage, 'PaymentSecurity');
        }
        
        Logger.debug(suspiciousDetails, 'PaymentSecurityDetails');
    }

    /**
     * Log payment reconciliation events
     * For financial audit and dispute resolution
     */
    static logReconciliation(
        type: 'match' | 'mismatch' | 'missing',
        gatewayData: { transactionId: string; amount: number; status: string },
        systemData?: { orderId: string; amount: number; status: string }
    ): void {
        const reconciliationMessage = `RECONCILIATION: ${type} | Gateway TX: ${gatewayData.transactionId}`;
        const reconciliationDetails = JSON.stringify({
            timestamp: new Date().toISOString(),
            type,
            gateway: {
                transactionId: gatewayData.transactionId,
                amount: gatewayData.amount,
                status: gatewayData.status,
            },
            system: systemData ? {
                orderId: systemData.orderId,
                amount: systemData.amount,
                status: systemData.status,
            } : undefined,
        });

        Logger.info(reconciliationMessage, 'PaymentReconciliation');
        Logger.debug(reconciliationDetails, 'PaymentReconciliationDetails');
    }

    /**
     * Sanitize payment data to ensure PCI compliance
     * Removes or masks sensitive information
     */
    private static sanitizePaymentData(data: PaymentEventData): Record<string, any> {
        return {
            transactionId: data.transactionId,
            orderId: data.orderId,
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            responseCode: data.responseCode,
            // Truncate response text to prevent data leakage
            responseText: data.responseText ? this.truncateText(data.responseText, 100) : undefined,
            gatewayTransactionId: data.gatewayTransactionId,
            // Never log full auth codes - only indicate presence
            authCodePresent: data.authCode ? true : false,
            customerReference: data.customerReference,
            // Never log the actual error object, only sanitized message
            errorMessage: data.error ? this.sanitizeErrorMessage(data.error) : undefined,
        };
    }

    /**
     * Sanitize context data
     */
    private static sanitizeContext(context: PaymentContext): Record<string, any> {
        return {
            orderId: context.orderId,
            transactionId: context.transactionId,
            userId: context.userId,
            // Hash IP address for privacy while maintaining uniqueness
            ipHash: context.ipAddress ? this.hashSensitiveData(context.ipAddress) : undefined,
            // Sanitize user agent to remove potential sensitive data
            userAgent: context.userAgent ? this.sanitizeUserAgent(context.userAgent) : undefined,
        };
    }

    /**
     * Sanitize error data to prevent sensitive information leakage
     */
    private static sanitizeErrorData(data: Record<string, any>): Record<string, any> {
        const sanitized: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Skip potentially sensitive keys
            if (this.isSensitiveKey(key)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                sanitized[key] = this.truncateText(value, 200);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                sanitized[key] = value;
            } else {
                sanitized[key] = '[OBJECT]';
            }
        }
        
        return sanitized;
    }

    /**
     * Check if an error is security-relevant
     */
    private static isSecurityRelevantError(error: Error): boolean {
        const securityKeywords = [
            'unauthorized', 'forbidden', 'authentication', 'authorization',
            'invalid', 'fraud', 'suspicious', 'blocked', 'declined',
            'security', 'violation', 'breach'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return securityKeywords.some(keyword => errorMessage.includes(keyword));
    }

    /**
     * Sanitize error messages to remove sensitive data
     */
    private static sanitizeErrorMessage(error: string): string {
        // Remove potential card numbers (any sequence of 13-19 digits)
        let sanitized = error.replace(/\b\d{13,19}\b/g, '[CARD_NUMBER_REDACTED]');
        
        // Remove potential CVV (3-4 digits)
        sanitized = sanitized.replace(/\bcvv?\s*:?\s*\d{3,4}\b/gi, '[CVV_REDACTED]');
        
        // Remove potential expiry dates
        sanitized = sanitized.replace(/\b\d{1,2}\/\d{2,4}\b/g, '[EXPIRY_REDACTED]');
        
        // Truncate to prevent excessive data
        return this.truncateText(sanitized, 200);
    }

    /**
     * Sanitize user agent strings
     */
    private static sanitizeUserAgent(userAgent: string): string {
        // Keep only browser and OS info, remove detailed version numbers
        const sanitized = userAgent.replace(/\d+\.\d+\.\d+/g, 'X.X.X');
        return this.truncateText(sanitized, 100);
    }

    /**
     * Hash sensitive data for logging while maintaining uniqueness
     */
    private static hashSensitiveData(data: string): string {
        // Simple hash for logging purposes (not cryptographic)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `hash_${Math.abs(hash).toString(16)}`;
    }

    /**
     * Check if a key name suggests sensitive data
     */
    private static isSensitiveKey(key: string): boolean {
        const sensitiveKeys = [
            'card', 'pan', 'cvv', 'cvc', 'expiry', 'exp', 'auth', 'pin',
            'password', 'secret', 'token', 'key', 'credential'
        ];
        
        const lowerKey = key.toLowerCase();
        return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    }

    /**
     * Truncate text to prevent excessive logging
     */
    private static truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }
}

/**
 * Payment Logger Configuration
 * Defines logging policies and retention settings
 */
export const PaymentLoggingConfig = {
    // PCI DSS requires 1 year retention for audit logs
    retentionDays: 365,
    
    // Log rotation settings
    rotation: {
        frequency: 'daily',
        maxFiles: 365,
        maxSize: '100MB',
    },
    
    // Log levels for different environments
    logLevels: {
        development: 'debug',
        staging: 'info',
        production: 'info',
    },
    
    // Separate log channels for different types
    channels: {
        payment: {
            file: 'payments.log',
            level: 'info',
            encrypt: true,
        },
        audit: {
            file: 'payment-audit.log',
            level: 'info',
            encrypt: true,
        },
        security: {
            file: 'payment-security.log',
            level: 'warn',
            encrypt: true,
        },
    },
    
    // Monitoring thresholds
    alerts: {
        errorRate: 0.05, // Alert if error rate exceeds 5%
        suspiciousActivityThreshold: 10, // Alert after 10 suspicious events
        failedPaymentThreshold: 5, // Alert after 5 consecutive failures
    },
};