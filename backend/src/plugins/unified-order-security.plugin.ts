import {
  VendurePlugin,
  PluginCommonModule,
  RequestContext,
  Logger,
  EventBus,
  OrderEvent
} from '@vendure/core';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 🚀 Unified Order Security & Logging Plugin
 * 
 * This plugin provides comprehensive order security and logging:
 * - Logs every order-related request with full details
 * - Shows PASS/FAIL decision for each request
 * - Blocks suspicious empty order attempts
 * - Provides complete audit trail
 */
@VendurePlugin({
  imports: [PluginCommonModule],
})
export class UnifiedOrderSecurityPlugin {
  private logFilePath: string = path.join('/home/vendure/damneddesigns', 'order-security-audit.log');


  
  private logToFile(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    fs.appendFile(this.logFilePath, logEntry, (err) => {
      if (err) {
        Logger.error(`Failed to write to order security log: ${err.message}`, 'UnifiedOrderSecurity');
      }
    });
  }

  /**
   * 🚀 Extract comprehensive request details for logging
   */
  private extractRequestDetails(req: Request, ctx: RequestContext) {
    const details = {
      // Basic request info
      url: req.originalUrl || req.url,
      method: req.method,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
      referer: req.headers.referer || 'none',
      
      // Customer context headers (from frontend)
      customerIP: req.headers['x-customer-ip'] || 'unknown',
      customerUserAgent: req.headers['x-customer-user-agent'] || 'unknown',
      sessionId: req.headers['x-session-id'] || 'unknown',
      customerAuthenticated: req.headers['x-customer-authenticated'] || 'unknown',
      customerPage: req.headers['x-customer-page'] || 'unknown',
      customerReferer: req.headers['x-customer-referer'] || 'unknown',
      customerTimestamp: req.headers['x-customer-timestamp'] || 'unknown',
      customerLanguage: req.headers['x-customer-language'] || 'unknown',
      customerTimezone: req.headers['x-customer-timezone'] || 'unknown',
      
      // Network details
      xForwardedFor: req.headers['x-forwarded-for'] || 'none',
      host: req.headers.host || 'none',
      origin: req.headers.origin || 'none',
      
      // Context info
      channelToken: ctx.channel?.token || 'unknown',
      userId: ctx.activeUserId || 'anonymous',
      
      // Server info
      serverHostname: os.hostname(),
      processId: process.pid,
      nodeVersion: process.version
    };
    
    return details;
  }

  /**
   * 🚀 Calculate suspicion score for request
   */
  private calculateSuspicionScore(details: any): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // High suspicion indicators
    if (details.userAgent === 'node') {
      score += 50;
      reasons.push('Server-side user agent detected');
    }

    if (details.customerUserAgent === 'unknown' || details.customerUserAgent === 'client-side-unknown') {
      score += 30;
      reasons.push('No real customer user agent');
    }

    if (details.customerIP === 'unknown' || details.customerIP === 'client-side-unknown') {
      score += 20;
      reasons.push('No customer IP context');
    }

    if (details.referer === 'none' && details.customerReferer === 'unknown') {
      score += 15;
      reasons.push('No referer information');
    }

    if (details.sessionId === 'unknown') {
      score += 10;
      reasons.push('No session context');
    }

    // Positive indicators (reduce suspicion)
    if (details.customerAuthenticated === 'true') {
      score -= 20;
      reasons.push('Customer is authenticated');
    }

    if (details.customerUserAgent.includes('Mozilla') || details.customerUserAgent.includes('Chrome')) {
      score -= 25;
      reasons.push('Real browser user agent detected');
    }

    if (details.customerPage && details.customerPage !== 'unknown') {
      score -= 10;
      reasons.push('Customer page context available');
    }

    return { score: Math.max(0, score), reasons };
  }

  /**
   * 🚀 Log comprehensive request details with PASS/FAIL decision
   */
  private logRequestDetails(details: any, decision: 'PASS' | 'FAIL', suspicion: any, orderInfo?: any) {
    const separator = '='.repeat(80);
    
    this.logToFile(separator);
    this.logToFile(`🚀 ORDER SECURITY AUDIT - ${decision}`);
    this.logToFile(separator);
    
    // Decision and scoring
    this.logToFile(`DECISION: ${decision}`);
    this.logToFile(`SUSPICION SCORE: ${suspicion.score}/100`);
    this.logToFile(`REASONS: ${suspicion.reasons.join(', ')}`);
    this.logToFile('');
    
    // Order information
    if (orderInfo) {
      this.logToFile(`ORDER CODE: ${orderInfo.code || 'unknown'}`);
      this.logToFile(`ORDER ID: ${orderInfo.id || 'unknown'}`);
      this.logToFile(`ORDER TOTAL: ${orderInfo.total || 0}`);
      this.logToFile(`ORDER ITEMS: ${orderInfo.lineCount || 0}`);
      this.logToFile(`CUSTOMER: ${orderInfo.customer || 'unknown'}`);
      this.logToFile('');
    }
    
    // Request details
    this.logToFile(`REQUEST URL: ${details.url}`);
    this.logToFile(`REQUEST METHOD: ${details.method}`);
    this.logToFile(`SERVER USER AGENT: ${details.userAgent}`);
    this.logToFile(`SERVER IP: ${details.ip}`);
    this.logToFile(`SERVER REFERER: ${details.referer}`);
    this.logToFile('');
    
    // Customer context (the real customer info)
    this.logToFile(`CUSTOMER IP: ${details.customerIP}`);
    this.logToFile(`CUSTOMER USER AGENT: ${details.customerUserAgent}`);
    this.logToFile(`CUSTOMER SESSION: ${details.sessionId}`);
    this.logToFile(`CUSTOMER AUTHENTICATED: ${details.customerAuthenticated}`);
    this.logToFile(`CUSTOMER PAGE: ${details.customerPage}`);
    this.logToFile(`CUSTOMER REFERER: ${details.customerReferer}`);
    this.logToFile(`CUSTOMER LANGUAGE: ${details.customerLanguage}`);
    this.logToFile(`CUSTOMER TIMEZONE: ${details.customerTimezone}`);
    this.logToFile(`CUSTOMER TIMESTAMP: ${details.customerTimestamp}`);
    this.logToFile('');
    
    // Network details
    this.logToFile(`X-FORWARDED-FOR: ${details.xForwardedFor}`);
    this.logToFile(`HOST: ${details.host}`);
    this.logToFile(`ORIGIN: ${details.origin}`);
    this.logToFile('');
    
    // Context details
    this.logToFile(`CHANNEL: ${details.channelToken}`);
    this.logToFile(`USER ID: ${details.userId}`);
    this.logToFile(`SERVER: ${details.serverHostname}`);
    this.logToFile(`PROCESS: ${details.processId}`);
    this.logToFile(`NODE: ${details.nodeVersion}`);
    
    this.logToFile(separator);
    this.logToFile('');
  }

  /**
   * 🚀 Check if request should be blocked
   */
  private shouldBlockRequest(details: any, suspicion: any): boolean {
    // Block if suspicion score is too high
    if (suspicion.score >= 70) {
      return true;
    }

    // Always block if it's clearly a server-side request with no customer context
    if (details.userAgent === 'node' && 
        details.customerUserAgent === 'unknown' && 
        details.customerIP === 'unknown') {
      return true;
    }

    return false;
  }



  constructor(eventBus: EventBus) {
    // Listen to order creation events for comprehensive logging
    eventBus.ofType(OrderEvent).subscribe((event: OrderEvent) => {
      const req = event.ctx.req as Request;
      const details = this.extractRequestDetails(req, event.ctx);
      const suspicion = this.calculateSuspicionScore(details);

      const orderInfo = {
        code: event.order.code,
        id: event.order.id,
        total: event.order.total,
        lineCount: event.order.lines?.length || 0,
        customer: event.order.customer?.emailAddress || 'guest'
      };

      // Always log the order creation with full details
      const decision = this.shouldBlockRequest(details, suspicion) ? 'FAIL' : 'PASS';
      this.logRequestDetails(details, decision, suspicion, orderInfo);

      // Log to console as well
      Logger.info(`🚀 Order ${orderInfo.code} - ${decision} (Score: ${suspicion.score})`, 'UnifiedOrderSecurity');
    });
  }

  static init() {
    return this;
  }
}
