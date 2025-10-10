#!/usr/bin/env node

/**
 * Redis Health Monitor for PM2
 * Monitors Redis container health and provides centralized logging
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class RedisMonitor {
  constructor() {
    this.containerName = 'redis-server';
    this.checkInterval = 30000; // 30 seconds
    this.logFile = path.join(__dirname, 'logs', 'plugins', 'redis-monitor.log');
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.isShuttingDown = false;
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.log('🚀 Redis Monitor starting...');
    this.setupGracefulShutdown();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    
    // Append to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async checkDockerContainer() {
    return new Promise((resolve) => {
      exec(`docker ps --filter "name=${this.containerName}" --format "{{.Status}}"`, (error, stdout) => {
        if (error) {
          resolve({ running: false, status: 'ERROR', details: error.message });
          return;
        }
        
        const status = stdout.trim();
        const running = status.includes('Up');
        
        resolve({
          running,
          status: running ? 'RUNNING' : 'STOPPED',
          details: status || 'Container not found'
        });
      });
    });
  }

  async checkRedisConnectivity() {
    return new Promise((resolve) => {
      exec(`docker exec ${this.containerName} redis-cli ping`, (error, stdout) => {
        if (error) {
          resolve({ connected: false, response: null, error: error.message });
          return;
        }
        
        const response = stdout.trim();
        resolve({
          connected: response === 'PONG',
          response,
          error: null
        });
      });
    });
  }

  async getRedisInfo() {
    return new Promise((resolve) => {
      exec(`docker exec ${this.containerName} redis-cli info memory`, (error, stdout) => {
        if (error) {
          resolve({ error: error.message });
          return;
        }
        
        const info = {};
        stdout.split('\n').forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            if (key && value) {
              info[key.trim()] = value.trim();
            }
          }
        });
        
        resolve({
          usedMemory: info.used_memory_human || 'N/A',
          peakMemory: info.used_memory_peak_human || 'N/A',
          memoryFragmentation: info.mem_fragmentation_ratio || 'N/A'
        });
      });
    });
  }

  async performHealthCheck() {
    try {
      // Check Docker container status
      const containerStatus = await this.checkDockerContainer();
      
      if (!containerStatus.running) {
        this.consecutiveFailures++;
        this.log(`❌ Redis container is not running: ${containerStatus.details}`, 'ERROR');
        
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.log(`🚨 Redis has failed ${this.consecutiveFailures} consecutive times!`, 'CRITICAL');
          // Container should auto-restart due to restart policy
          this.log('📋 Container restart policy should handle this automatically', 'INFO');
        }
        
        return false;
      }

      // Check Redis connectivity
      const connectivity = await this.checkRedisConnectivity();
      
      if (!connectivity.connected) {
        this.consecutiveFailures++;
        this.log(`❌ Redis connectivity failed: ${connectivity.error}`, 'ERROR');
        return false;
      }

      // Get Redis memory info
      const memoryInfo = await this.getRedisInfo();
      
      // Reset failure counter on success
      if (this.consecutiveFailures > 0) {
        this.log(`✅ Redis recovered after ${this.consecutiveFailures} failures`, 'INFO');
        this.consecutiveFailures = 0;
      }

      // Log successful health check (less verbose)
      if (this.consecutiveFailures === 0) {
        this.log(`✅ Redis healthy - Memory: ${memoryInfo.usedMemory}, Peak: ${memoryInfo.peakMemory}`, 'DEBUG');
      }

      return true;

    } catch (error) {
      this.consecutiveFailures++;
      this.log(`❌ Health check failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async start() {
    this.log('🔍 Starting Redis health monitoring...');
    
    // Initial health check
    await this.performHealthCheck();
    
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.performHealthCheck();
      }
    }, this.checkInterval);
    
    this.log(`⏰ Health checks scheduled every ${this.checkInterval / 1000} seconds`);
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      this.log('🛑 Shutting down Redis monitor...');
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      this.log('👋 Redis monitor stopped');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGUSR2', shutdown); // PM2 reload signal
  }
}

// Start the monitor
const monitor = new RedisMonitor();
monitor.start().catch(error => {
  console.error('Failed to start Redis monitor:', error);
  process.exit(1);
});
