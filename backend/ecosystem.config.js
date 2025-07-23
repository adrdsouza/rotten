module.exports = {
  apps: [
    {
      name: "admin",
      script: "dist/index.js",

      // SESSION AFFINITY CONFIGURATION - Fixed for cart data isolation
      instances: 1, // Single instance to prevent session mixing between processes
      exec_mode: "fork", // Fork mode for session consistency

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
      log_file: 'logs/pm2-admin.log',
      out_file: 'logs/pm2-admin-out.log',
      error_file: 'logs/pm2-admin-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Health monitoring
      health_check_url: 'http://localhost:3000/health',
      health_check_grace_period: 3000,
    },
    {
      name: "worker",
      script: "dist/index-worker.js",

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
      log_file: 'logs/pm2-worker.log',
      out_file: 'logs/pm2-worker-out.log',
      error_file: 'logs/pm2-worker-error.log',
      merge_logs: true,
    }
  ]
};
