module.exports = {
  apps: [
    {
      name: 'store',
      script: 'pnpm',
      args: 'serve',
      cwd: '/home/vendure/damneddesigns/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        HOST: '0.0.0.0',
        // 🚀 DEDICATED vCPU OPTIMIZATIONS - Performance tuning
        NODE_OPTIONS: [
          '--max-old-space-size=512',        // Reduced memory for efficiency
          '--max-semi-space-size=64',        // Faster garbage collection
          '--enable-source-maps',            // Better error reporting
          '--no-warnings',                   // Reduce console noise
          '--unhandled-rejections=strict'    // Catch promise errors
        ].join(' '),
        // CPU affinity optimizations for dedicated vCPU
        UV_THREADPOOL_SIZE: '4',             // Increase thread pool for I/O
        // Explicitly unset problematic pnpm environment variables
        NPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: undefined,
        NPM_CONFIG__JSR_REGISTRY: undefined,
      },
      // 🚀 SINGLE INSTANCE: Avoid port conflicts and process instability
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',          // Optimized for dedicated vCPU efficiency

      // 🚀 DEDICATED vCPU PERFORMANCE MONITORING
      max_cpu_restart: 80,                 // Restart if CPU usage > 80% for extended period
      instance_var: 'INSTANCE_ID',         // Load balancing between instances
      
      // Enhanced Security and Monitoring
      kill_timeout: 5000, // Graceful shutdown timeout
      listen_timeout: 3000, // Startup timeout
      max_restarts: 10, // Limit restart attempts
      min_uptime: '10s', // Minimum uptime before considering stable
      
      // Enhanced Logging with timestamps
      log_file: './logs/pm2-frontend.log',
      out_file: './logs/pm2-frontend-out.log',
      error_file: './logs/pm2-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health Monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    }
  ]
};