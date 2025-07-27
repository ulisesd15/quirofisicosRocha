module.exports = {
  apps: [{
    name: 'quirofisicos-rocha',
    script: 'server.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1, // Start with 1 instance, can be increased based on server capacity
    exec_mode: 'fork', // Use fork mode for better memory management
    watch: false, // Disable in production
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    // Advanced options
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Environment specific
    node_args: '--max-old-space-size=1024'
  }]
};
