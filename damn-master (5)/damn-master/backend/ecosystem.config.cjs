module.exports = {
  apps: [
    {
      name: "admin",
      script: "dist/src/index.js",

      // SINGLE ADMIN PROCESS CONFIGURATION
      instances: 1, // Single admin process
      exec_mode: "cluster", // Keep cluster mode for admin

      // Memory and performance optimization
      node_args: [
        '--max-old-space-size=4096', // Increase heap size to 4GB
        '--optimize-for-size', // Optimize for memory usage
        '--gc-interval=100' // More frequent garbage collection
      ],

      env: {
        NODE_ENV: "production",
        APP_ENV: "prod",
        // Performance optimizations
        UV_THREADPOOL_SIZE: 16, // Increase thread pool for I/O operations
        NODE_OPTIONS: '--enable-source-maps'
      },

      // Increased memory limit for high traffic
      max_memory_restart: "3G", // Increased from 1G to 3G

      // Health and restart configuration
      wait_ready: true,
      kill_timeout: 30000,
      listen_timeout: 15000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging for performance monitoring
      log_file: '/home/vendure/damneddesigns/logs/backend/pm2-admin.log',
      out_file: '/home/vendure/damneddesigns/logs/backend/pm2-admin-out.log',
      error_file: '/home/vendure/damneddesigns/logs/backend/pm2-admin-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Health monitoring
      health_check_url: 'http://localhost:3000/health',
      health_check_grace_period: 3000,
    },
    {
      name: "worker",
      script: "dist/src/index-worker.js",

      // Worker optimization (fewer instances for background processing)
      instances: 2, // Dedicated worker instances
      exec_mode: "cluster",

      // Worker-specific memory optimization
      node_args: [
        '--max-old-space-size=2048', // Less memory for workers
        '--optimize-for-size'
      ],

      env: {
        NODE_ENV: "production",
        APP_ENV: "prod",
        WORKER_MODE: "true",
        UV_THREADPOOL_SIZE: 8 // Fewer threads for workers
      },

      // Worker restart policies
      max_memory_restart: "2G",
      wait_ready: true,
      kill_timeout: 30000,
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '30s',

      // Worker logging
      log_file: '/home/vendure/damneddesigns/logs/backend/pm2-worker.log',
      out_file: '/home/vendure/damneddesigns/logs/backend/pm2-worker-out.log',
      error_file: '/home/vendure/damneddesigns/logs/backend/pm2-worker-error.log',
      merge_logs: true,
    },
    {
      name: "redis",
      script: "redis/redis-monitor.js",
      cwd: "/home/vendure/damneddesigns/backend",

      // Single instance monitoring process
      instances: 1,
      exec_mode: "fork",

      // Environment configuration
      env: {
        NODE_ENV: "production",
        APP_ENV: "prod",
        REDIS_MONITOR_INTERVAL: "30000", // 30 seconds
        REDIS_CONTAINER_NAME: "redis-server"
      },

      // Memory and performance settings
      node_args: [
        '--max-old-space-size=256', // Minimal memory for monitoring
        '--optimize-for-size'
      ],

      // Restart policies
      autorestart: true,
      max_memory_restart: "128M", // Very low memory limit for monitor
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Health monitoring
      wait_ready: false, // Don't wait for ready signal
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Logging configuration
      log_file: '/home/vendure/damneddesigns/logs/plugins/pm2-redis-monitor.log',
      out_file: '/home/vendure/damneddesigns/logs/plugins/pm2-redis-monitor-out.log',
      error_file: '/home/vendure/damneddesigns/logs/plugins/pm2-redis-monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Monitoring specific settings
      watch: false, // Don't watch files for changes
      ignore_watch: ["logs", "node_modules"],

      // Process management
      kill_retry_time: 100
    },
    {
      name: "dashboard",
      script: "/home/vendure/damneddesigns/backend/start-dashboard.sh",
      cwd: "/home/vendure/damneddesigns/backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        APP_ENV: "prod"
      },
      max_memory_restart: "512M",
      error_file: "/home/vendure/.pm2/logs/dashboard-error.log",
      out_file: "/home/vendure/.pm2/logs/dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
