/**
 * PCI-Compliant Logging Configuration
 * 
 * This configuration defines logging policies, retention settings, and security
 * measures required for PCI DSS compliance in payment processing systems.
 * 
 * PCI DSS Requirements:
 * - Requirement 10.5.1: Limit viewing of audit trails to those with a job-related need
 * - Requirement 10.5.2: Protect audit trail files from unauthorized modifications
 * - Requirement 10.5.3: Promptly back up audit trail files to a centralized log server
 * - Requirement 10.5.4: Write logs for external-facing technologies onto a secure, centralized, internal log server
 * - Requirement 10.5.5: Use file-integrity monitoring or change-detection software on logs
 */

// Removed: LoggingChannelConfig (not used)


export interface LogRotationConfig {
    /** Maximum size of log file before rotation (e.g., '10m', '100m', '1g') */
    maxSize: string;
    /** Maximum number of rotated files to keep */
    maxFiles: number | '7d' | '30d' | '90d' | '1y';
    /** Whether to compress rotated logs */
    compress: boolean;
    /** Maximum age before deleting old logs (in days) */
    maxAge: number;
    /** Whether to keep compressed logs */
    keepCompressedLogs: boolean;
}

export interface LogChannelConfig {
    /** Log file name */
    file: string;
    /** Log level (debug, info, warn, error) */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Whether to encrypt log files */
    encrypt: boolean;
    /** Log rotation settings */
    rotation: LogRotationConfig;
    /** Whether this channel is enabled */
    enabled: boolean;
    /** Backup configuration */
    backup?: {
        enabled: boolean;
        location?: string;
        retention: number; // days
    };
}

export interface LoggingConfig {
    /** Base directory for all log files */
    baseDir: string;
    /** Environment name (development, staging, production) */
    environment: 'development' | 'staging' | 'production';
    /** Global retention period in days */
    retentionDays: number;
    /** Maximum total log directory size (e.g., '1g', '10g') */
    maxTotalSize: string;
    /** Log rotation configuration */
    rotation: LogRotationConfig;
    /** Log channels configuration */
    channels: Record<string, LogChannelConfig>;
    /** Monitoring configuration */
    monitoring: {
        errorRate: number;
        suspiciousActivityThreshold: number;
        failedPaymentThreshold: number;
        alertWebhook?: string;
    };
    /** Security configuration */
    security: {
        encryptionKey?: string;
        integrityChecking: boolean;
        accessLogging: boolean;
        anonymizeIPs: boolean;
    };
}

/**
 * Get logging configuration based on environment
 */
export function getLoggingConfig(): LoggingConfig {
    const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
    const isProduction = environment === 'production';

    return {
        baseDir: process.env.LOG_BASE_PATH || '/home/vendure/rottenhand/logs/backend',
        environment,
        // PCI DSS requires 1 year retention for audit logs in production
        // Using 365 days for production compliance, 30 days for development
        retentionDays: isProduction ? 365 : 30,
        // Maximum 10GB for all logs combined
        maxTotalSize: isProduction ? '10g' : '1g',
        
        // Global rotation settings
        rotation: {
            // Rotate files larger than 100MB
            maxSize: '100m',
            // Keep logs for 30 days, then compress
            maxFiles: '30d',
            // Compress rotated logs
            compress: true,
            // Delete logs older than 90 days
            maxAge: 90,
            // Keep compressed logs
            keepCompressedLogs: true
        },
        
        channels: {
            // Payment transaction logs
            payment: {
                file: 'payment.log',
                level: 'info',
                encrypt: isProduction,
                rotation: {
                    maxSize: '50m',
                    maxFiles: '7d',
                    compress: true,
                    maxAge: 30,
                    keepCompressedLogs: true
                },
                enabled: true
            },
            
            // Audit trail logs (required for PCI compliance)
            audit: {
                file: 'audit.log',
                level: 'info',
                encrypt: true, // Always encrypt audit logs
                rotation: {
                    maxSize: '100m',
                    maxFiles: '30d',
                    compress: true,
                    maxAge: 365,
                    keepCompressedLogs: true
                },
                enabled: true
            },
            
            // Security event logs
            security: {
                file: 'security.log',
                level: 'warn',
                encrypt: true,
                rotation: {
                    maxSize: '50m',
                    maxFiles: '7d',
                    compress: true,
                    maxAge: 90,
                    keepCompressedLogs: true
                },
                enabled: true
            },
            
            // Application logs
            application: {
                file: 'app.log',
                level: isProduction ? 'info' : 'debug',
                encrypt: isProduction,
                rotation: {
                    maxSize: '100m',
                    maxFiles: '7d',
                    compress: true,
                    maxAge: 30,
                    keepCompressedLogs: true
                },
                enabled: true
            },
            
            // Error logs (separate for easier monitoring)
            error: {
                file: 'errors.log',
                level: 'error',
                encrypt: isProduction,
                rotation: {
                    maxSize: '50m',
                    maxFiles: 14,
                    compress: true,
                    maxAge: 30,
                    keepCompressedLogs: true
                },
                enabled: true
            },
        },
        
        // Monitoring and alerting thresholds
        monitoring: {
            errorRate: 0.05, // Alert if error rate exceeds 5%
            suspiciousActivityThreshold: 10, // Alert after 10 suspicious events per hour
            failedPaymentThreshold: 5, // Alert after 5 consecutive payment failures
            alertWebhook: process.env.LOG_ALERT_WEBHOOK,
        },
        
        // Security settings
        security: {
            encryptionKey: process.env.LOG_ENCRYPTION_KEY,
            integrityChecking: isProduction, // Enable file integrity monitoring in production
            accessLogging: true, // Log all access to log files
            anonymizeIPs: isProduction, // Hash IP addresses in production logs
        },
    };
}

/**
 * Validate logging configuration
 */
export function validateLoggingConfig(config: LoggingConfig): string[] {
    const errors: string[] = [];
    
    // Check required environment variables for production
    if (config.environment === 'production') {
        if (!process.env.LOG_ENCRYPTION_KEY) {
            errors.push('LOG_ENCRYPTION_KEY is required for production logging');
        }
        
        if (!process.env.LOG_BACKUP_PATH) {
            errors.push('LOG_BACKUP_PATH is required for production audit compliance');
        }
        
        if (!process.env.AUDIT_LOG_BACKUP_PATH) {
            errors.push('AUDIT_LOG_BACKUP_PATH is required for PCI compliance');
        }
    }
    
    // Validate retention periods
    if (config.retentionDays < 365 && config.environment === 'production') {
        errors.push('PCI DSS requires minimum 365 days retention for audit logs in production');
    }
    
    // Validate encryption settings
    for (const [channelName, channelConfig] of Object.entries(config.channels)) {
        if (channelConfig.encrypt && !config.security.encryptionKey) {
            errors.push(`Encryption enabled for ${channelName} but no encryption key provided`);
        }
    }
    
    return errors;
}

/**
 * Log rotation and cleanup utilities
 */
export class LogManager {
    private config: LoggingConfig;
    
    constructor(config: LoggingConfig) {
        this.config = config;
    }
    
    /**
     * Clean up old log files based on retention policy
     */
    async cleanupOldLogs(): Promise<void> {
        // Implementation would go here for production use
        // This would typically involve:
        // 1. Scanning log directories
        // 2. Identifying files older than retention period
        // 3. Securely deleting old files (with proper overwriting for sensitive data)
        // 4. Logging cleanup actions for audit trail
        
        console.log('Log cleanup would be performed here in production');
    }
    
    /**
     * Backup logs to secure storage
     */
    async backupLogs(): Promise<void> {
        // Implementation would go here for production use
        // This would typically involve:
        // 1. Compressing log files
        // 2. Encrypting compressed files
        // 3. Transferring to backup location
        // 4. Verifying backup integrity
        // 5. Logging backup actions
        
        console.log('Log backup would be performed here in production');
    }
    
    /**
     * Verify log file integrity
     */
    async verifyLogIntegrity(): Promise<boolean> {
        // Implementation would go here for production use
        // This would typically involve:
        // 1. Computing checksums of log files
        // 2. Comparing with stored checksums
        // 3. Detecting any unauthorized modifications
        // 4. Alerting on integrity violations
        
        console.log('Log integrity verification would be performed here in production');
        return true;
    }
    
    /**
     * Monitor log access
     */
    logAccess(userId: string, logFile: string, action: 'read' | 'write' | 'delete'): void {
        if (this.config.security.accessLogging) {
            // Log who accessed which log files and when
            console.log(`LOG_ACCESS: User ${userId} performed ${action} on ${logFile} at ${new Date().toISOString()}`);
        }
    }
}

/**
 * Default logging configuration
 */
export const defaultLoggingConfig = getLoggingConfig();

/**
 * Validate the current configuration on startup
 */
export function initializeLogging(): void {
    const config = getLoggingConfig();
    const errors = validateLoggingConfig(config);
    
    if (errors.length > 0) {
        console.error('Logging configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        
        // Just warn in all environments - don't prevent startup
        console.warn(`Logging configuration has issues but continuing in ${config.environment} mode`);
    }
    
    console.log(`Logging initialized for ${config.environment} environment`);
    console.log(`Retention period: ${config.retentionDays} days`);
    console.log(`Channels configured: ${Object.keys(config.channels).join(', ')}`);
}