module.exports = {
  apps: [
    {
      name: "store",
      script: "start-server.js",
      cwd: "/home/vendure/rottenhand/frontend",

      // Single instance for session consistency
      instances: 1,
      exec_mode: "fork",

      // Memory and performance optimization
      node_args: [
        '--max-old-space-size=2048', // 2GB heap size
        '--optimize-for-size'
      ],

      env: {
        NODE_ENV: "production",
        PORT: "4000",
        HOST: "0.0.0.0",
        // Performance optimizations
        UV_THREADPOOL_SIZE: 8,
        NODE_OPTIONS: '--enable-source-maps'
      },


      // Memory management
      max_memory_restart: "1536M",

      // Health and restart configuration
      wait_ready: true,
      kill_timeout: 30000,
      listen_timeout: 15000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_file: '../logs/pm2/pm2-store.log',
      out_file: '../logs/pm2/pm2-store-out.log',
      error_file: '../logs/pm2/pm2-store-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto restart on file changes in development
      watch: false,
      ignore_watch: [
        "node_modules",
        "logs",
        "tmp",
        ".git"
      ],

      // Health monitoring
      health_check_url: 'http://localhost:4000',
      health_check_grace_period: 3000,
    }
  ]
};