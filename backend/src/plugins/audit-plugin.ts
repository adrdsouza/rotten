import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { Logger } from '@vendure/core';
import { PaymentLogger } from '../utils/payment-logger';
import { initializeLogging } from '../config/logging-config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Audit Plugin for PCI-Compliant Payment Logging
 *
 * This plugin provides comprehensive audit logging capabilities required for
 * PCI DSS compliance. It integrates with Vendure's lifecycle events to
 * automatically log payment-related activities and administrative access.
 *
 * Features:
 * - Automatic payment event logging
 * - Administrative access tracking
 * - Security event monitoring
 * - PCI-compliant data sanitization
 * - Audit trail maintenance
 */

@VendurePlugin({
    compatibility: '^3.3.0',
    imports: [PluginCommonModule],
    configuration: config => {
        // Initialize logging configuration on plugin load
        try {
            // Set up logging paths with fallbacks
            const logBasePath = process.env.LOG_BASE_PATH || '/home/vendure/damneddesigns/backend/logs';
            
            // Ensure base log directory exists
            if (!fs.existsSync(logBasePath)) {
                fs.mkdirSync(logBasePath, { recursive: true, mode: 0o750 });
            }
            
            // Set environment variables if not already set
            const logVars = {
                LOG_BACKUP_PATH: path.join(logBasePath, 'backup'),
                AUDIT_LOG_BACKUP_PATH: path.join(logBasePath, 'audit-backup'),
                SECURITY_LOG_BACKUP_PATH: path.join(logBasePath, 'security-backup'),
                APP_LOG_BACKUP_PATH: path.join(logBasePath, 'app-backup')
            };
            
            // Set environment variables and ensure directories exist
            Object.entries(logVars).forEach(([key, dir]) => {
                process.env[key] = process.env[key] || dir;
                if (!fs.existsSync(process.env[key]!)) {
                    fs.mkdirSync(process.env[key]!, { recursive: true, mode: 0o750 });
                }
            });
            
            initializeLogging();
            Logger.info('Audit Plugin: PCI-compliant logging initialized', 'AuditPlugin');
            
            // Log application startup for audit trail
            PaymentLogger.logAdminAccess(
                'system',
                'application_start',
                'payment_system',
                {
                    ipAddress: 'localhost',
                    userAgent: 'Vendure Application Server',
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('Audit Plugin: Failed to initialize logging', 'AuditPlugin');
            Logger.error(errorMessage, 'AuditPlugin');
            throw error;
        }
        
        return config;
    },
})
export class AuditPlugin {

    /**
     * Log payment processing events
     * Called from payment handlers to maintain audit trail
     */
    static logPaymentProcessing(
        orderId: string,
        transactionId: string,
        amount: number,
        currency: string,
        status: 'success' | 'failed' | 'pending',
        gatewayResponse?: {
            responseCode?: string;
            responseText?: string;
            authCode?: string;
        }
    ): void {
        PaymentLogger.logPaymentEvent('sale', {
            orderId,
            transactionId,
            amount,
            currency,
            status,
            responseCode: gatewayResponse?.responseCode,
            responseText: gatewayResponse?.responseText,
            authCode: gatewayResponse?.authCode,
        });
    }

    /**
     * Log refund processing events
     */
    static logRefundProcessing(
        orderId: string,
        originalTransactionId: string,
        refundTransactionId: string,
        amount: number,
        currency: string,
        status: 'success' | 'failed' | 'pending',
        gatewayResponse?: {
            responseCode?: string;
            responseText?: string;
        }
    ): void {
        PaymentLogger.logPaymentEvent('refund', {
            orderId,
            transactionId: refundTransactionId,
            amount,
            currency,
            status,
            responseCode: gatewayResponse?.responseCode,
            responseText: gatewayResponse?.responseText,
            customerReference: originalTransactionId,
        });
    }

    /**
     * Log administrative access to payment data
     * Should be called whenever admin users access payment information
     */
    static logAdminPaymentAccess(
        userId: string,
        action: string,
        resourceId: string,
        resourceType: 'order' | 'payment' | 'refund' | 'customer',
        ipAddress?: string,
        userAgent?: string
    ): void {
        PaymentLogger.logAdminAccess(
            userId,
            `${action}_${resourceType}`,
            resourceId,
            {
                ipAddress,
                userAgent,
            }
        );
    }

    /**
     * Log suspicious payment activity
     * For fraud detection and security monitoring
     */
    static logSuspiciousPaymentActivity(
        activityType: 'multiple_failures' | 'unusual_amount' | 'velocity_check' | 'fraud_indicator',
        description: string,
        orderId?: string,
        customerId?: string,
        ipAddress?: string,
        severity: 'low' | 'medium' | 'high' = 'medium'
    ): void {
        PaymentLogger.logSuspiciousActivity(
            activityType,
            description,
            {
                orderId,
                userId: customerId,
                ipAddress,
            },
            severity
        );
    }

    /**
     * Log payment system errors
     * For debugging and security monitoring
     */
    static logPaymentError(
        errorType: 'gateway_error' | 'validation_error' | 'system_error' | 'configuration_error',
        error: Error,
        context?: {
            orderId?: string;
            transactionId?: string;
            userId?: string;
            ipAddress?: string;
        }
    ): void {
        PaymentLogger.logPaymentError(
            errorType,
            error,
            context
        );
    }

    /**
     * Log payment reconciliation events
     * For financial audit and dispute resolution
     */
    static logPaymentReconciliation(
        type: 'daily_reconciliation' | 'dispute_investigation' | 'chargeback_processing',
        gatewayTransactionId: string,
        amount: number,
        status: string,
        systemOrderId?: string,
        systemAmount?: number,
        systemStatus?: string
    ): void {
        PaymentLogger.logReconciliation(
            type === 'daily_reconciliation' ? 'match' : 'mismatch',
            {
                transactionId: gatewayTransactionId,
                amount,
                status,
            },
            systemOrderId ? {
                orderId: systemOrderId,
                amount: systemAmount || 0,
                status: systemStatus || 'unknown',
            } : undefined
        );
    }

    /**
     * Monitor payment failure rates
     * Alert on suspicious patterns
     */
    static monitorPaymentFailures(
        orderId: string,
        failureCount: number,
        timeWindow: number, // minutes
        ipAddress?: string
    ): void {
        if (failureCount >= 3) {
            this.logSuspiciousPaymentActivity(
                'multiple_failures',
                `${failureCount} payment failures in ${timeWindow} minutes`,
                orderId,
                undefined,
                ipAddress,
                failureCount >= 5 ? 'high' : 'medium'
            );
        }
    }

    /**
     * Monitor unusual payment amounts
     * Alert on potential fraud
     */
    static monitorPaymentAmounts(
        orderId: string,
        amount: number,
        customerAverageAmount?: number,
        ipAddress?: string
    ): void {
        if (customerAverageAmount && amount > customerAverageAmount * 10) {
            this.logSuspiciousPaymentActivity(
                'unusual_amount',
                `Payment amount ${amount} is ${Math.round(amount / customerAverageAmount)}x customer average`,
                orderId,
                undefined,
                ipAddress,
                amount > customerAverageAmount * 50 ? 'high' : 'medium'
            );
        }
    }

    /**
     * Log PCI compliance events
     * For audit and compliance reporting
     */
    static logComplianceEvent(
        eventType: 'data_access' | 'data_export' | 'system_maintenance' | 'security_scan',
        description: string,
        userId: string,
        affectedRecords?: number,
        ipAddress?: string
    ): void {
        PaymentLogger.logAdminAccess(
            userId,
            `compliance_${eventType}`,
            description,
            {
                ipAddress,
                userAgent: `Compliance Event - ${affectedRecords || 0} records affected`,
            }
        );
    }
}

/**
 * Utility functions for common audit scenarios
 */
export class AuditUtils {
    /**
     * Create audit context from HTTP request
     */
    static createAuditContext(req: any): {
        ipAddress?: string;
        userAgent?: string;
        userId?: string;
    } {
        return {
            ipAddress: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.get?.('User-Agent'),
            userId: req?.user?.id || req?.session?.userId,
        };
    }

    /**
     * Sanitize sensitive data for logging
     */
    static sanitizeForAudit(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sanitized = { ...data };
        const sensitiveKeys = [
            'password', 'token', 'secret', 'key', 'auth', 'credential',
            'card', 'pan', 'cvv', 'cvc', 'expiry', 'pin'
        ];

        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Generate audit trail summary
     */
    static generateAuditSummary(
        startDate: Date,
        endDate: Date
    ): {
        period: string;
        paymentEvents: number;
        adminAccess: number;
        securityEvents: number;
        errors: number;
    } {
        // In a real implementation, this would query the audit logs
        // and generate statistics for compliance reporting
        return {
            period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
            paymentEvents: 0, // Would be calculated from logs
            adminAccess: 0,   // Would be calculated from logs
            securityEvents: 0, // Would be calculated from logs
            errors: 0,        // Would be calculated from logs
        };
    }
}