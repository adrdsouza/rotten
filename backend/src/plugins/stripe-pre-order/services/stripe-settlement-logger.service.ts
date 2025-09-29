import { Injectable, Logger } from '@nestjs/common';
import { PaymentLogger } from '../../../utils/payment-logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Enhanced logging service for Stripe payment settlement operations
 * Provides structured logging with PCI compliance and detailed audit trails
 */
@Injectable()
export class StripeSettlementLoggerService {
    private readonly logger = new Logger('StripeSettlementLogger');
    private readonly logDir: string;

    constructor() {
        this.logDir = process.env.LOG_BASE_PATH || '/home/vendure/rottenhand/backend/logs';
        this.ensureLogDirectories();
    }

    /**
     * Log settlement attempt start
     */
    logSettlementAttemptStart(
        paymentIntentId: string,
        orderCode: string,
        amount: number,
        currency: string,
        context?: { userId?: string; ipAddress?: string }
    ): void {
        const logData = {
            event: 'settlement_attempt_start',
            paymentIntentId,
            orderCode,
            amount,
            currency,
            timestamp: new Date().toISOString(),
            context: this.sanitizeContext(context)
        };

        this.logger.log(`[SETTLEMENT_START] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, Amount: ${amount} ${currency}`);
        
        PaymentLogger.logPaymentEvent('settle', {
            transactionId: paymentIntentId,
            orderId: orderCode,
            amount,
            currency,
            status: 'attempting'
        }, context);

        this.writeToSettlementLog('settlement_attempts', logData);
    }

    /**
     * Log successful settlement
     */
    logSettlementSuccess(
        paymentIntentId: string,
        orderCode: string,
        paymentId: string,
        durationMs: number,
        stripeStatus: string,
        context?: { userId?: string; ipAddress?: string }
    ): void {
        const logData = {
            event: 'settlement_success',
            paymentIntentId,
            orderCode,
            paymentId,
            durationMs,
            stripeStatus,
            timestamp: new Date().toISOString(),
            context: this.sanitizeContext(context)
        };

        this.logger.log(
            `[SETTLEMENT_SUCCESS] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `PaymentID: ${paymentId}, Duration: ${durationMs}ms, StripeStatus: ${stripeStatus}`
        );

        PaymentLogger.logPaymentEvent('settle', {
            transactionId: paymentIntentId,
            orderId: orderCode,
            status: 'settled',
            responseCode: '200',
            responseText: 'Settlement successful'
        }, context);

        this.writeToSettlementLog('settlement_successes', logData);
        this.writeToAuditLog('SETTLEMENT_SUCCESS', logData);
    }

    /**
     * Log settlement failure
     */
    logSettlementFailure(
        paymentIntentId: string,
        orderCode: string,
        error: string,
        errorCategory: 'validation' | 'api' | 'database' | 'stripe' | 'unknown',
        durationMs: number,
        context?: { userId?: string; ipAddress?: string }
    ): void {
        const logData = {
            event: 'settlement_failure',
            paymentIntentId,
            orderCode,
            error: this.sanitizeErrorMessage(error),
            errorCategory,
            durationMs,
            timestamp: new Date().toISOString(),
            context: this.sanitizeContext(context)
        };

        this.logger.error(
            `[SETTLEMENT_FAILURE] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `Error: ${error}, Category: ${errorCategory}, Duration: ${durationMs}ms`
        );

        PaymentLogger.logPaymentEvent('settle', {
            transactionId: paymentIntentId,
            orderId: orderCode,
            status: 'failed',
            error: this.sanitizeErrorMessage(error)
        }, context);

        this.writeToSettlementLog('settlement_failures', logData);
        this.writeToAuditLog('SETTLEMENT_FAILURE', logData);

        // Log to security if it might be a security issue
        if (this.isSecurityRelevantError(error)) {
            this.logSecurityEvent('settlement_security_failure', paymentIntentId, orderCode, error, context);
        }
    }

    /**
     * Log API verification attempt
     */
    logApiVerificationAttempt(
        paymentIntentId: string,
        orderCode: string,
        retryAttempt: number = 1
    ): void {
        const logData = {
            event: 'api_verification_attempt',
            paymentIntentId,
            orderCode,
            retryAttempt,
            timestamp: new Date().toISOString()
        };

        this.logger.debug(
            `[API_VERIFICATION_ATTEMPT] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, Retry: ${retryAttempt}`
        );

        this.writeToSettlementLog('api_verifications', logData);
    }

    /**
     * Log successful API verification
     */
    logApiVerificationSuccess(
        paymentIntentId: string,
        orderCode: string,
        stripeStatus: string,
        amount: number,
        currency: string,
        durationMs: number,
        retryAttempt: number = 1
    ): void {
        const logData = {
            event: 'api_verification_success',
            paymentIntentId,
            orderCode,
            stripeStatus,
            amount,
            currency,
            durationMs,
            retryAttempt,
            timestamp: new Date().toISOString()
        };

        this.logger.log(
            `[API_VERIFICATION_SUCCESS] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `Status: ${stripeStatus}, Amount: ${amount} ${currency}, Duration: ${durationMs}ms, Retry: ${retryAttempt}`
        );

        this.writeToSettlementLog('api_verifications', logData);
    }

    /**
     * Log API verification failure
     */
    logApiVerificationFailure(
        paymentIntentId: string,
        orderCode: string,
        error: string,
        errorType: string,
        durationMs: number,
        retryAttempt: number = 1,
        willRetry: boolean = false
    ): void {
        const logData = {
            event: 'api_verification_failure',
            paymentIntentId,
            orderCode,
            error: this.sanitizeErrorMessage(error),
            errorType,
            durationMs,
            retryAttempt,
            willRetry,
            timestamp: new Date().toISOString()
        };

        const logLevel = willRetry ? 'warn' : 'error';
        this.logger[logLevel](
            `[API_VERIFICATION_FAILURE] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `Error: ${error}, Type: ${errorType}, Duration: ${durationMs}ms, Retry: ${retryAttempt}, WillRetry: ${willRetry}`
        );

        this.writeToSettlementLog('api_verifications', logData);

        if (!willRetry) {
            this.writeToAuditLog('API_VERIFICATION_FAILURE', logData);
        }
    }

    /**
     * Log PaymentIntent lifecycle events
     */
    logPaymentIntentLifecycle(
        paymentIntentId: string,
        event: 'created' | 'linked' | 'confirmed' | 'settled' | 'failed',
        orderCode?: string,
        metadata?: Record<string, any>
    ): void {
        const logData = {
            event: `lifecycle_${event}`,
            paymentIntentId,
            orderCode,
            metadata: metadata ? this.sanitizeMetadata(metadata) : undefined,
            timestamp: new Date().toISOString()
        };

        this.logger.log(
            `[LIFECYCLE_${event.toUpperCase()}] PaymentIntent: ${paymentIntentId}` +
            (orderCode ? `, Order: ${orderCode}` : '') +
            (metadata ? `, Metadata: ${JSON.stringify(this.sanitizeMetadata(metadata))}` : '')
        );

        this.writeToSettlementLog('lifecycle_events', logData);

        // Log important lifecycle events to audit log
        if (['settled', 'failed'].includes(event)) {
            this.writeToAuditLog(`LIFECYCLE_${event.toUpperCase()}`, logData);
        }
    }

    /**
     * Log idempotency check results
     */
    logIdempotencyCheck(
        paymentIntentId: string,
        orderCode: string,
        alreadySettled: boolean,
        existingStatus?: string
    ): void {
        const logData = {
            event: 'idempotency_check',
            paymentIntentId,
            orderCode,
            alreadySettled,
            existingStatus,
            timestamp: new Date().toISOString()
        };

        this.logger.log(
            `[IDEMPOTENCY_CHECK] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `AlreadySettled: ${alreadySettled}, Status: ${existingStatus || 'N/A'}`
        );

        this.writeToSettlementLog('idempotency_checks', logData);
    }

    /**
     * Log validation failures
     */
    logValidationFailure(
        paymentIntentId: string,
        orderCode: string,
        validationType: 'status' | 'amount' | 'order' | 'ownership',
        expected: any,
        actual: any,
        context?: { userId?: string; ipAddress?: string }
    ): void {
        const logData = {
            event: 'validation_failure',
            paymentIntentId,
            orderCode,
            validationType,
            expected: this.sanitizeValue(expected),
            actual: this.sanitizeValue(actual),
            timestamp: new Date().toISOString(),
            context: this.sanitizeContext(context)
        };

        this.logger.error(
            `[VALIDATION_FAILURE] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `Type: ${validationType}, Expected: ${expected}, Actual: ${actual}`
        );

        this.writeToSettlementLog('validation_failures', logData);
        this.writeToAuditLog('VALIDATION_FAILURE', logData);

        // Log potential security issues
        if (['order', 'ownership'].includes(validationType)) {
            this.logSecurityEvent('validation_security_failure', paymentIntentId, orderCode, 
                `${validationType} validation failed: expected ${expected}, got ${actual}`, context);
        }
    }

    /**
     * Log database transaction events
     */
    logDatabaseTransaction(
        paymentIntentId: string,
        orderCode: string,
        operation: 'start' | 'commit' | 'rollback',
        reason?: string
    ): void {
        const logData = {
            event: 'database_transaction',
            paymentIntentId,
            orderCode,
            operation,
            reason,
            timestamp: new Date().toISOString()
        };

        this.logger.debug(
            `[DB_TRANSACTION] PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, ` +
            `Operation: ${operation}${reason ? `, Reason: ${reason}` : ''}`
        );

        this.writeToSettlementLog('database_transactions', logData);
    }

    /**
     * Log security events
     */
    private logSecurityEvent(
        eventType: string,
        paymentIntentId: string,
        orderCode: string,
        description: string,
        context?: { userId?: string; ipAddress?: string }
    ): void {
        const logData = {
            event: eventType,
            paymentIntentId,
            orderCode,
            description: this.sanitizeErrorMessage(description),
            timestamp: new Date().toISOString(),
            context: this.sanitizeContext(context)
        };

        this.logger.warn(`[SECURITY_EVENT] ${eventType}: ${description}`);

        PaymentLogger.logSuspiciousActivity(
            eventType,
            `PaymentIntent: ${paymentIntentId}, Order: ${orderCode} - ${description}`,
            context,
            'medium'
        );

        this.writeToSecurityLog(logData);
    }

    /**
     * Generate settlement summary report
     */
    async generateSettlementSummary(
        startDate: Date,
        endDate: Date
    ): Promise<{
        period: { start: Date; end: Date };
        summary: {
            totalAttempts: number;
            successfulSettlements: number;
            failedSettlements: number;
            successRate: number;
            averageDurationMs: number;
        };
        errorBreakdown: Record<string, number>;
        recommendations: string[];
    }> {
        // This would typically read from log files or database
        // For now, return a placeholder structure
        return {
            period: { start: startDate, end: endDate },
            summary: {
                totalAttempts: 0,
                successfulSettlements: 0,
                failedSettlements: 0,
                successRate: 0,
                averageDurationMs: 0
            },
            errorBreakdown: {},
            recommendations: [
                'Implement log file parsing for detailed analytics',
                'Consider using structured logging with external aggregation service'
            ]
        };
    }

    // Private helper methods

    private ensureLogDirectories(): void {
        const directories = [
            'stripe-settlement',
            'stripe-settlement/settlement_attempts',
            'stripe-settlement/settlement_successes', 
            'stripe-settlement/settlement_failures',
            'stripe-settlement/api_verifications',
            'stripe-settlement/lifecycle_events',
            'stripe-settlement/idempotency_checks',
            'stripe-settlement/validation_failures',
            'stripe-settlement/database_transactions',
            'stripe-settlement/security_events'
        ];

        directories.forEach(dir => {
            const fullPath = path.join(this.logDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true, mode: 0o750 });
            }
        });
    }

    private writeToSettlementLog(category: string, data: any): void {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = JSON.stringify({
                timestamp,
                ...data
            });

            const date = timestamp.split('T')[0];
            const logFile = path.join(this.logDir, 'stripe-settlement', category, `${date}.log`);

            fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
        } catch (error) {
            this.logger.error(`Error writing to settlement log (${category}):`, error);
        }
    }

    private writeToAuditLog(eventType: string, data: any): void {
        try {
            const timestamp = new Date().toISOString();
            const auditEntry = JSON.stringify({
                timestamp,
                eventType,
                ...data
            });

            const date = timestamp.split('T')[0];
            const auditFile = path.join(this.logDir, 'audit-backup', `${date}.log`);

            // Ensure audit directory exists
            const auditDir = path.dirname(auditFile);
            if (!fs.existsSync(auditDir)) {
                fs.mkdirSync(auditDir, { recursive: true, mode: 0o750 });
            }

            fs.appendFileSync(auditFile, auditEntry + '\n', 'utf8');
        } catch (error) {
            this.logger.error('Error writing to audit log:', error);
        }
    }

    private writeToSecurityLog(data: any): void {
        try {
            const timestamp = new Date().toISOString();
            const securityEntry = JSON.stringify({
                timestamp,
                ...data
            });

            const date = timestamp.split('T')[0];
            const securityFile = path.join(this.logDir, 'stripe-settlement', 'security_events', `${date}.log`);

            fs.appendFileSync(securityFile, securityEntry + '\n', 'utf8');
        } catch (error) {
            this.logger.error('Error writing to security log:', error);
        }
    }

    private sanitizeContext(context?: { userId?: string; ipAddress?: string }): any {
        if (!context) return undefined;

        return {
            userId: context.userId,
            ipHash: context.ipAddress ? this.hashSensitiveData(context.ipAddress) : undefined
        };
    }

    private sanitizeErrorMessage(error: string): string {
        // Remove potential sensitive data from error messages
        let sanitized = error.replace(/\b\d{13,19}\b/g, '[CARD_REDACTED]');
        sanitized = sanitized.replace(/\bcvv?\s*:?\s*\d{3,4}\b/gi, '[CVV_REDACTED]');
        sanitized = sanitized.replace(/\b\d{1,2}\/\d{2,4}\b/g, '[EXPIRY_REDACTED]');
        return this.truncateText(sanitized, 500);
    }

    private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
        const sanitized: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(metadata)) {
            if (this.isSensitiveKey(key)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                sanitized[key] = this.truncateText(value, 100);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    private sanitizeValue(value: any): any {
        if (typeof value === 'string') {
            return this.sanitizeErrorMessage(value);
        }
        return value;
    }

    private isSecurityRelevantError(error: string): boolean {
        const securityKeywords = [
            'unauthorized', 'forbidden', 'authentication', 'authorization',
            'invalid', 'fraud', 'suspicious', 'blocked', 'declined',
            'security', 'violation', 'breach', 'mismatch', 'ownership'
        ];
        
        const errorMessage = error.toLowerCase();
        return securityKeywords.some(keyword => errorMessage.includes(keyword));
    }

    private isSensitiveKey(key: string): boolean {
        const sensitiveKeys = [
            'card', 'pan', 'cvv', 'cvc', 'expiry', 'exp', 'auth', 'pin',
            'password', 'secret', 'token', 'key', 'credential'
        ];
        
        const lowerKey = key.toLowerCase();
        return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    }

    private hashSensitiveData(data: string): string {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `hash_${Math.abs(hash).toString(16)}`;
    }

    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }
}