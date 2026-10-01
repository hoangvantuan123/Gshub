const path = require('path')

module.exports = {
  apps: [
    {
      name: 'gshub-service', // Tên service PM2
      script: process.platform === 'win32' ? './service-datahub.exe' : './service-datahub',
      cwd: __dirname,
      exec_interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 3000,

      // =========================================================================
      // CẤU HÌNH BIẾN MÔI TRƯỜNG KẾT NỐI (PRODUCTION)
      // Chuyển kết nối CSDL từ DATAHUB sang GSHUB
      // =========================================================================
      env: {
        APP_ENV: 'production',
        PORT: 9643,
        GRPC_PORT: 9644,

        // 1. CSDL PostgreSQL (Chuyển kết nối sang GsHub)
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'AdminErp#',
        DB_NAME: 'GsHub', // Đã chuyển kết nối CSDL sang GsHub
        DB_SSLMODE: 'disable',
        DB_MAX_OPEN_CONNS: '50',
        DB_MAX_IDLE_CONNS: '10',
        DB_CONN_MAX_LIFETIME_MINUTES: '30',

        // 2. Bảo mật JWT
        JWT_SECRET: 'syscore_gshub_super_secret_jwt_key_2026',
        JWT_EXPIRE_HOURS: '72',

        // 3. Kết nối Bravo ERP
        BRAVO_AUTH_URL: 'https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24',
        BRAVO_BASE_API_URL: 'https://bravo.goldsunpackaging.vn:5051',
        BRAVO_REFERER: 'https://bravo.goldsunpackaging.vn:5052/',
        BRAVO_CLIENT_ID: 'c52bd596-07ff-4329-a640-67f41a51a90e',
        BRAVO_CLIENT_SECRET: 'DC86276E4BF54018BE9EC05650681914',
        BRAVO_DEVICE_CODE: '45fd8c9a3974fe45589811c5dfbc2fef',
        BRAVO_CONNECTION_NAME: 'Default',
        BRAVO_GRANT_TYPE: 'password',
        BRAVO_SCOPE: 'ApiGateway offline_access',
        BRAVO_DEFAULT_USERNAME: 'IT_TUANHV',
        BRAVO_DEFAULT_PASSWORD: 'Tuan3112@',
        BRAVO_INSECURE_SKIP_VERIFY: 'true'
      },

      // =========================================================================
      // CẤU HÌNH MÔI TRƯỜNG DEVELOPMENT
      // =========================================================================
      env_development: {
        APP_ENV: 'development',
        PORT: 9643,
        GRPC_PORT: 9644,

        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'AdminErp#',
        DB_NAME: 'GsHub',
        DB_SSLMODE: 'disable',
        DB_MAX_OPEN_CONNS: '20',
        DB_MAX_IDLE_CONNS: '5',
        DB_CONN_MAX_LIFETIME_MINUTES: '30',

        JWT_SECRET: 'syscore_gshub_dev_jwt_key_2026',
        JWT_EXPIRE_HOURS: '72',

        BRAVO_AUTH_URL: 'https://bravo.goldsunpackaging.vn:5051/fa837234b0b27bc02365a940995bdc24',
        BRAVO_BASE_API_URL: 'https://bravo.goldsunpackaging.vn:5051',
        BRAVO_REFERER: 'https://bravo.goldsunpackaging.vn:5052/',
        BRAVO_CLIENT_ID: 'c52bd596-07ff-4329-a640-67f41a51a90e',
        BRAVO_CLIENT_SECRET: 'DC86276E4BF54018BE9EC05650681914',
        BRAVO_DEVICE_CODE: '45fd8c9a3974fe45589811c5dfbc2fef',
        BRAVO_CONNECTION_NAME: 'Default',
        BRAVO_GRANT_TYPE: 'password',
        BRAVO_SCOPE: 'ApiGateway offline_access',
        BRAVO_DEFAULT_USERNAME: 'IT_TUANHV',
        BRAVO_DEFAULT_PASSWORD: 'Tuan3112@',
        BRAVO_INSECURE_SKIP_VERIFY: 'true'
      },

      // Cấu hình log
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
}

