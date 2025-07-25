#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class RedisMonitor {
  constructor() {
    this.checkInterval = 30000; // Check every 30 seconds
    this.lastStatus = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
  }

  async checkRedisContainer() {
    try {
      // Check if container is running
      const { stdout: containerStatus } = await execAsync('docker ps --filter name=redis-server --format "{{.Status}}"');
      
      if (!containerStatus.trim()) {
        throw new Error('Redis container not found or not running');
      }

      // Check Redis connectivity
      const { stdout: redisResponse } = await execAsync('docker exec redis-server redis-cli ping');
      
      if (redisResponse.trim() !== 'PONG') {
        throw new Error('Redis not responding to ping');
      }

      // Get container stats
      const { stdout: stats } = await execAsync('docker stats redis-server --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}"');
      const statsLines = stats.trim().split('\n');
      const cpuMem = statsLines[1] || 'N/A';

      // Reset failure counter on success
      if (this.consecutiveFailures > 0) {
        console.log(`✅ Redis recovered after ${this.consecutiveFailures} failures`);
        this.consecutiveFailures = 0;
      }

      const status = {
        status: 'healthy',
        container: containerStatus.trim(),
        response: 'PONG',
        stats: cpuMem,
        timestamp: new Date().toISOString()
      };

      // Only log status changes or every 10 minutes
      if (!this.lastStatus || 
          this.lastStatus.status !== status.status || 
          Date.now() - this.lastStatusLog > 600000) {
        console.log(`🟢 Redis Status: ${status.container} | Response: ${status.response} | Stats: ${status.stats}`);
        this.lastStatusLog = Date.now();
      }

      this.lastStatus = status;
      return status;

    } catch (error) {
      this.consecutiveFailures++;
      
      const status = {
        status: 'unhealthy',
        error: error.message,
        failures: this.consecutiveFailures,
        timestamp: new Date().toISOString()
      };

      console.error(`🔴 Redis Error (${this.consecutiveFailures}/${this.maxFailures}): ${error.message}`);

      // Try to restart container if multiple failures
      if (this.consecutiveFailures >= this.maxFailures) {
        console.log(`🔄 Attempting to restart Redis container after ${this.consecutiveFailures} failures...`);
        try {
          await execAsync('docker restart redis-server');
          console.log('✅ Redis container restart initiated');
          this.consecutiveFailures = 0; // Reset after restart attempt
        } catch (restartError) {
          console.error(`❌ Failed to restart Redis container: ${restartError.message}`);
        }
      }

      this.lastStatus = status;
      return status;
    }
  }

  async getRedisInfo() {
    try {
      const { stdout } = await execAsync('docker exec redis-server redis-cli info server');
      const lines = stdout.split('\n');
      const info = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          info[key] = value.trim();
        }
      });

      return {
        version: info.redis_version,
        uptime: info.uptime_in_seconds,
        connections: info.connected_clients
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async start() {
    console.log('🚀 Redis Monitor started');
    console.log(`📊 Monitoring interval: ${this.checkInterval/1000}s`);
    console.log(`⚠️  Max failures before restart: ${this.maxFailures}`);
    
    // Initial info
    const info = await this.getRedisInfo();
    if (!info.error) {
      console.log(`📋 Redis Info: v${info.version} | Uptime: ${info.uptime}s | Connections: ${info.connections}`);
    }

    // Start monitoring loop
    setInterval(async () => {
      await this.checkRedisContainer();
    }, this.checkInterval);

    // Initial check
    await this.checkRedisContainer();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Redis Monitor shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Redis Monitor terminated');
  process.exit(0);
});

// Start the monitor
const monitor = new RedisMonitor();
monitor.start().catch(error => {
  console.error('❌ Failed to start Redis monitor:', error);
  process.exit(1);
});
