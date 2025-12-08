/**
 * PM2 Ecosystem Configuration
 * Ensures proper environment variable loading and process management
 */

module.exports = {
  apps: [{
    name: 'sg2',
    script: 'src/server/server.ts',
    interpreter: 'tsx',
    cwd: '/home/ubuntu/sg2',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: './.env',
    env: {
      NODE_ENV: 'production',
      PORT: '8000',
      HOST: '0.0.0.0'
    },
    error_file: './logs/sg2-error.log',
    out_file: './logs/sg2-out.log',
    log_file: './logs/sg2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};