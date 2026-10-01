module.exports = {
  apps: [
    {
      name: 'gshub-erp',
      cwd: __dirname,
      script: './node_modules/serve/build/main.js',
      args: '-s dist/renderer -l 7640',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '3G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}