module.exports = {
  apps: [
    {
      name: 'gshub-erp',
      script: 'npx',
      args: 'serve out/renderer/ --single -p 3000',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '3G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
