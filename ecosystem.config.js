module.exports = {
  apps: [
    {
      name: 'ai-company-memory-api',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        API_PORT: 3000,
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3000,
        LOG_LEVEL: 'warn'
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      
      // Restart policy
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      monitor: true,
      
      // Health checks
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Memory management
      max_memory_restart: '512M',
      
      // Advanced features
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      
      // Environment variables from .env file
      env_file: '.env'
    }
  ]
};