import { Logger } from '@vendure/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Enhanced payment logging utility for audit trails and compliance
 * Provides structured logging for payment events, security incidents, and debugging
 */
export class PaymentLogger {
    private static readonly LOG_DIR = process.env.PAYMENT_LOG_DIR || './logs/payments';
    private static readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
    private static readonly MAX_LOG_FILES = 10;

    /**
     * Initialize logging directory
     */
    private static ensureLogDirectory(): void {
        try {
            if (!fs.existsSync(this.LOG_DIR)) {
                fs.mkdirSync(this.LOG_DIR, { recursive: true });
            }
        } catch (error) {
            Logger.error(`Failed to create payment log directory: ${error}`, 'PaymentLogger');
        }
    }

    /**
     * Log payment events for audit trail
     */
    static logPaymentEvent(
        action: 'create' | 'link' | 'settle' | 'fail' | 'retry' | 'cancel',
        details: {
            paymentIntentId?: string;
            orderId?: string;
            orderCode?: string;
            amount?: number;
            currency?: string;
            status?: string;
            error?: string;
            responseText?: string;
            userId?: string;
            customerEmail?: string;
            metadata?: Record<string, any>;
        }
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            level: 'INFO',
            ...details,
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        };

        // Log to console
        Logger.info(`[PAYMENT_EVENT] ${action.toUpperCase()}: ${JSON.stringify(logEntry)}`, 'PaymentLogger');

        // Log to file
        this.writeToFile('payment-events.log', logEntry);
    }

    /**
     * Log security-related events
     */
    static logSuspiciousActivity(
        type: string,
        description: string,
        paymentIntentId?: string,
        severity: 'low' | 'medium' | 'high' = 'medium',
        metadata?: Record<string, any>
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT',
            eventType: type,
            description,
            paymentIntentId,
            severity,
            level: 'WARN',
            metadata,
            environment: process.env.NODE_ENV || 'development'
        };

        // Log to console with appropriate level
        if (severity === 'high') {
            Logger.error(`[SECURITY] ${description}`, 'PaymentLogger');
        } else if (severity === 'medium') {
            Logger.warn(`[SECURITY] ${description}`, 'PaymentLogger');
        } else {
            Logger.info(`[SECURITY] ${description}`, 'PaymentLogger');
        }

        // Log to file
        this.writeToFile('security-events.log', logEntry);
    }

    /**
     * Log performance metrics
     */
    static logPerformanceMetric(
        operation: string,
        duration: number,
        success: boolean,
        metadata?: Record<string, any>
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'PERFORMANCE_METRIC',
            operation,
            duration,
            success,
            level: 'INFO',
            metadata,
            environment: process.env.NODE_ENV || 'development'
        };

        Logger.debug(`[PERFORMANCE] ${operation}: ${duration}ms (${success ? 'SUCCESS' : 'FAILED'})`, 'PaymentLogger');
        this.writeToFile('performance-metrics.log', logEntry);
    }

    /**
     * Log API interactions with Stripe
     */
    static logStripeApiCall(
        method: string,
        endpoint: string,
        success: boolean,
        duration: number,
        statusCode?: number,
        error?: string,
        paymentIntentId?: string
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'STRIPE_API_CALL',
            method,
            endpoint,
            success,
            duration,
            statusCode,
            error,
            paymentIntentId,
            level: success ? 'INFO' : 'ERROR',
            environment: process.env.NODE_ENV || 'development'
        };

        if (success) {
            Logger.debug(`[STRIPE_API] ${method} ${endpoint}: ${duration}ms`, 'PaymentLogger');
        } else {
            Logger.error(`[STRIPE_API] ${method} ${endpoint} FAILED: ${error} (${duration}ms)`, 'PaymentLogger');
        }

        this.writeToFile('stripe-api.log', logEntry);
    }

    /**
     * Log database operations
     */
    static logDatabaseOperation(
        operation: string,
        table: string,
        success: boolean,
        duration: number,
        recordId?: string,
        error?: string
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'DATABASE_OPERATION',
            operation,
            table,
            success,
            duration,
            recordId,
            error,
            level: success ? 'DEBUG' : 'ERROR',
            environment: process.env.NODE_ENV || 'development'
        };

        if (success) {
            Logger.debug(`[DATABASE] ${operation} ${table}: ${duration}ms`, 'PaymentLogger');
        } else {
            Logger.error(`[DATABASE] ${operation} ${table} FAILED: ${error} (${duration}ms)`, 'PaymentLogger');
        }

        this.writeToFile('database-operations.log', logEntry);
    }

    /**
     * Write log entry to file with rotation
     */
    private static writeToFile(filename: string, logEntry: any): void {
        try {
            this.ensureLogDirectory();
            
            const logPath = path.join(this.LOG_DIR, filename);
            const logLine = JSON.stringify(logEntry) + '\n';

            // Check file size and rotate if necessary
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath);
                if (stats.size > this.MAX_LOG_SIZE) {
                    this.rotateLogFile(logPath);
                }
            }

            // Append to log file
            fs.appendFileSync(logPath, logLine, 'utf8');

        } catch (error) {
            Logger.error(`Failed to write to payment log file: ${error}`, 'PaymentLogger');
        }
    }

    /**
     * Rotate log files when they get too large
     */
    private static rotateLogFile(logPath: string): void {
        try {
            const dir = path.dirname(logPath);
            const basename = path.basename(logPath, path.extname(logPath));
            const extension = path.extname(logPath);

            // Shift existing rotated files
            for (let i = this.MAX_LOG_FILES - 1; i > 0; i--) {
                const oldFile = path.join(dir, `${basename}.${i}${extension}`);
                const newFile = path.join(dir, `${basename}.${i + 1}${extension}`);
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.MAX_LOG_FILES - 1) {
                        fs.unlinkSync(oldFile); // Delete oldest file
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }

            // Move current file to .1
            const rotatedFile = path.join(dir, `${basename}.1${extension}`);
            fs.renameSync(logPath, rotatedFile);

            Logger.info(`Rotated payment log file: ${logPath}`, 'PaymentLogger');

        } catch (error) {
            Logger.error(`Failed to rotate payment log file: ${error}`, 'PaymentLogger');
        }
    }

    /**
     * Get log statistics
     */
    static getLogStats(): {
        totalFiles: number;
        totalSize: number;
        oldestLog: string | null;
        newestLog: string | null;
    } {
        try {
            this.ensureLogDirectory();
            
            const files = fs.readdirSync(this.LOG_DIR);
            let totalSize = 0;
            let oldestTime = Infinity;
            let newestTime = 0;
            let oldestLog = null;
            let newestLog = null;

            for (const file of files) {
                const filePath = path.join(this.LOG_DIR, file);
                const stats = fs.statSync(filePath);
                
                totalSize += stats.size;
                
                if (stats.mtime.getTime() < oldestTime) {
                    oldestTime = stats.mtime.getTime();
                    oldestLog = stats.mtime.toISOString();
                }
                
                if (stats.mtime.getTime() > newestTime) {
                    newestTime = stats.mtime.getTime();
                    newestLog = stats.mtime.toISOString();
                }
            }

            return {
                totalFiles: files.length,
                totalSize,
                oldestLog,
                newestLog
            };

        } catch (error) {
            Logger.error(`Failed to get log stats: ${error}`, 'PaymentLogger');
            return {
                totalFiles: 0,
                totalSize: 0,
                oldestLog: null,
                newestLog: null
            };
        }
    }

    /**
     * Clean up old log files
     */
    static cleanupOldLogs(daysToKeep: number = 30): void {
        try {
            this.ensureLogDirectory();
            
            const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            const files = fs.readdirSync(this.LOG_DIR);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.LOG_DIR, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                Logger.info(`Cleaned up ${deletedCount} old payment log files`, 'PaymentLogger');
            }

        } catch (error) {
            Logger.error(`Failed to cleanup old payment logs: ${error}`, 'PaymentLogger');
        }
    }
}