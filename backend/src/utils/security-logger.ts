import fs from 'fs';
import path from 'path';

export interface SecurityLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  event: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  details: Record<string, any>;
  action?: string;
  endpoint?: string;
}

export class SecurityLogger {
  private logDir: string;
  private logFile: string;
  private maxFileSize: number;
  private maxFiles: number;

  constructor(options: {
    logDir?: string;
    maxFileSize?: number; // in bytes
    maxFiles?: number;
  } = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), 'logs', 'security');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 10;
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.logFile = path.join(this.logDir, 'security.log');
  }

  /**
   * Log a security event
   */
  log(entry: Omit<SecurityLogEntry, 'timestamp'>): void {
    const logEntry: SecurityLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      // Check if we need to rotate the log file
      this.rotateIfNeeded();
      
      // Append to log file
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  /**
   * Log reCAPTCHA verification events
   */
  logRecaptcha(data: {
    success: boolean;
    score?: number;
    action: string;
    ip: string;
    userAgent: string;
    errorCodes?: string[];
    reasons?: string[];
  }): void {
    this.log({
      level: data.success ? 'INFO' : 'WARN',
      event: 'RECAPTCHA_VERIFICATION',
      ip: data.ip,
      userAgent: data.userAgent,
      action: data.action,
      details: {
        success: data.success,
        score: data.score,
        errorCodes: data.errorCodes,
        reasons: data.reasons
      }
    });
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(data: {
    ip: string;
    userAgent: string;
    endpoint: string;
    action: string;
    blocked: boolean;
    attempts: number;
    windowMs: number;
  }): void {
    this.log({
      level: data.blocked ? 'WARN' : 'INFO',
      event: 'RATE_LIMIT',
      ip: data.ip,
      userAgent: data.userAgent,
      endpoint: data.endpoint,
      action: data.action,
      details: {
        blocked: data.blocked,
        attempts: data.attempts,
        windowMs: data.windowMs
      }
    });
  }

  /**
   * Log bot detection events
   */
  logBotDetection(data: {
    ip: string;
    userAgent: string;
    endpoint: string;
    detected: boolean;
    reasons: string[];
    honeypotTriggered?: boolean;
    formTiming?: number;
  }): void {
    this.log({
      level: data.detected ? 'WARN' : 'INFO',
      event: 'BOT_DETECTION',
      ip: data.ip,
      userAgent: data.userAgent,
      endpoint: data.endpoint,
      details: {
        detected: data.detected,
        reasons: data.reasons,
        honeypotTriggered: data.honeypotTriggered,
        formTiming: data.formTiming
      }
    });
  }

  /**
   * Log authentication events
   */
  logAuth(data: {
    event: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_RESET';
    ip: string;
    userAgent: string;
    userId?: string;
    email?: string;
    reason?: string;
  }): void {
    this.log({
      level: data.event === 'LOGIN_FAILURE' ? 'WARN' : 'INFO',
      event: data.event,
      ip: data.ip,
      userAgent: data.userAgent,
      userId: data.userId,
      details: {
        email: data.email,
        reason: data.reason
      }
    });
  }

  /**
   * Log checkout security events
   */
  logCheckout(data: {
    event: 'CHECKOUT_ATTEMPT' | 'CHECKOUT_SUCCESS' | 'CHECKOUT_FAILURE' | 'PAYMENT_BLOCKED';
    ip: string;
    userAgent: string;
    userId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    reason?: string;
  }): void {
    this.log({
      level: data.event.includes('FAILURE') || data.event.includes('BLOCKED') ? 'WARN' : 'INFO',
      event: data.event,
      ip: data.ip,
      userAgent: data.userAgent,
      userId: data.userId,
      details: {
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        reason: data.reason
      }
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspicious(data: {
    event: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    details?: Record<string, any>;
  }): void {
    this.log({
      level: data.severity === 'CRITICAL' ? 'CRITICAL' : 'WARN',
      event: `SUSPICIOUS_${data.event}`,
      ip: data.ip,
      userAgent: data.userAgent,
      endpoint: data.endpoint,
      details: {
        severity: data.severity,
        description: data.description,
        ...data.details
      }
    });
  }

  /**
   * Rotate log file if it exceeds maximum size
   */
  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) {
        return;
      }

      const stats = fs.statSync(this.logFile);
      if (stats.size >= this.maxFileSize) {
        this.rotateLogFile();
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  /**
   * Rotate the current log file
   */
  private rotateLogFile(): void {
    try {
      // Move existing numbered files up
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            // Delete the oldest file
            fs.unlinkSync(oldFile);
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      if (fs.existsSync(this.logFile)) {
        fs.renameSync(this.logFile, `${this.logFile}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Read recent security logs
   */
  readRecentLogs(lines: number = 100): SecurityLogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      return logLines
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line) as SecurityLogEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as SecurityLogEntry[];
    } catch (error) {
      console.error('Failed to read security logs:', error);
      return [];
    }
  }

  /**
   * Get security statistics from logs
   */
  getSecurityStats(hoursBack: number = 24): {
    totalEvents: number;
    recaptchaFailures: number;
    rateLimitViolations: number;
    botDetections: number;
    authFailures: number;
    suspiciousActivity: number;
    topIPs: Array<{ ip: string; count: number }>;
  } {
    const logs = this.readRecentLogs(10000); // Read more for stats
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const recentLogs = logs.filter(log => 
      new Date(log.timestamp) >= cutoffTime
    );

    const ipCounts = new Map<string, number>();
    let recaptchaFailures = 0;
    let rateLimitViolations = 0;
    let botDetections = 0;
    let authFailures = 0;
    let suspiciousActivity = 0;

    recentLogs.forEach(log => {
      if (log.ip) {
        ipCounts.set(log.ip, (ipCounts.get(log.ip) || 0) + 1);
      }

      switch (log.event) {
        case 'RECAPTCHA_VERIFICATION':
          if (!log.details.success) recaptchaFailures++;
          break;
        case 'RATE_LIMIT':
          if (log.details.blocked) rateLimitViolations++;
          break;
        case 'BOT_DETECTION':
          if (log.details.detected) botDetections++;
          break;
        case 'LOGIN_FAILURE':
          authFailures++;
          break;
        default:
          if (log.event.startsWith('SUSPICIOUS_')) suspiciousActivity++;
      }
    });

    const topIPs = Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    return {
      totalEvents: recentLogs.length,
      recaptchaFailures,
      rateLimitViolations,
      botDetections,
      authFailures,
      suspiciousActivity,
      topIPs
    };
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();
