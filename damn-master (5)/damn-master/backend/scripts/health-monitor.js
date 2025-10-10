#!/usr/bin/env node

/**
 * Comprehensive Health Monitoring Script
 * Monitors system health, security metrics, and performance
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

class HealthMonitor {
    constructor() {
        this.logFile = path.join(__dirname, '../logs/health-monitor.log');
        this.alertThresholds = {
            memoryUsage: 85, // %
            cpuUsage: 80, // %
            responseTime: 2000, // ms
            errorRate: 5, // %
        };
    }

    async checkEndpointHealth(url, timeout = 5000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const req = http.get(url, { timeout }, (res) => {
                const responseTime = Date.now() - start;
                const isHealthy = res.statusCode === 200 && responseTime < this.alertThresholds.responseTime;
                
                resolve({
                    url,
                    status: res.statusCode,
                    responseTime,
                    healthy: isHealthy,
                    timestamp: new Date().toISOString()
                });
            });

            req.on('error', () => {
                resolve({
                    url,
                    status: 'ERROR',
                    responseTime: Date.now() - start,
                    healthy: false,
                    timestamp: new Date().toISOString()
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    url,
                    status: 'TIMEOUT',
                    responseTime: timeout,
                    healthy: false,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }

    async checkSystemHealth() {
        const endpoints = [
            'http://localhost:3000/health',
            'http://localhost:3000/admin-api?query=%7B__typename%7D', // Safe GraphQL introspection query
            'http://localhost:3000/shop-api?query=%7B__typename%7D', // Safe GraphQL introspection query
            'http://localhost:4000', // Frontend
        ];

        const results = await Promise.all(
            endpoints.map(url => this.checkEndpointHealth(url))
        );

        return {
            timestamp: new Date().toISOString(),
            endpoints: results,
            overallHealth: results.every(r => r.healthy)
        };
    }

    logHealth(healthData) {
        const logEntry = {
            timestamp: healthData.timestamp,
            status: healthData.overallHealth ? 'HEALTHY' : 'UNHEALTHY',
            details: healthData.endpoints.map(e => ({
                endpoint: e.url,
                status: e.status,
                responseTime: e.responseTime,
                healthy: e.healthy
            }))
        };

        const logLine = JSON.stringify(logEntry) + '\n';
        
        try {
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to write health log:', error.message);
        }
    }

    async monitor() {
        console.log('🔍 Starting health monitoring...');
        
        try {
            const healthData = await this.checkSystemHealth();
            this.logHealth(healthData);

            // Console output
            console.log(`\n📊 Health Check Results - ${healthData.timestamp}`);
            console.log(`Overall Status: ${healthData.overallHealth ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
            
            healthData.endpoints.forEach(endpoint => {
                const status = endpoint.healthy ? '✅' : '❌';
                console.log(`${status} ${endpoint.url} - ${endpoint.status} (${endpoint.responseTime}ms)`);
            });

            // Alert if unhealthy
            if (!healthData.overallHealth) {
                console.log('\n🚨 ALERT: System health issues detected!');
                const unhealthyEndpoints = healthData.endpoints.filter(e => !e.healthy);
                unhealthyEndpoints.forEach(e => {
                    console.log(`   - ${e.url}: ${e.status}`);
                });
            }

        } catch (error) {
            console.error('❌ Health monitoring failed:', error.message);
            
            const errorLog = {
                timestamp: new Date().toISOString(),
                status: 'MONITOR_ERROR',
                error: error.message
            };
            
            try {
                fs.appendFileSync(this.logFile, JSON.stringify(errorLog) + '\n');
            } catch (logError) {
                console.error('Failed to log error:', logError.message);
            }
        }
    }
}

// Run monitoring
const monitor = new HealthMonitor();
monitor.monitor().then(() => {
    console.log('\n✅ Health monitoring completed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Health monitoring failed:', error);
    process.exit(1);
});