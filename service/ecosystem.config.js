const path = require('path')

module.exports = {
  apps: [
    // =========================================================================
    // 1. GSHUB API-GATEWAY (REST Entrypoint & Security Middlewares :9643)
    // =========================================================================
    {
      name: 'gshub-gateway',
      script: process.platform === 'win32' ? './main.exe' : './main',
      cwd: path.join(__dirname, 'api-gateway'),
      exec_interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 2000,
      env: {
        APP_ENV: 'production',
        NODE_ENV: 'production',
        PORT: 9643,
        HOST_GRPC_USER: '127.0.0.1:60051',
        HOST_GRPC_DATAHUB: '127.0.0.1:60052',
        HOST_GRPC_BASIC: '127.0.0.1:60051',
        HOST_GRPC_LOOKUP: '127.0.0.1:60051',
        PROTO_DIR: path.join(__dirname, 'proto'),
        JWT_SECRET: 'syscore_gshub_super_secret_jwt_key_2026',
        APP_SIGNATURE_SECRET: 'ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X'
      },
      env_development: {
        APP_ENV: 'development',
        NODE_ENV: 'dev',
        PORT: 9643,
        HOST_GRPC_USER: '127.0.0.1:60051',
        HOST_GRPC_DATAHUB: '127.0.0.1:60052',
        HOST_GRPC_BASIC: '127.0.0.1:60051',
        HOST_GRPC_LOOKUP: '127.0.0.1:60051',
        PROTO_DIR: path.join(__dirname, 'proto'),
        JWT_SECRET: 'syscore_gshub_dev_jwt_key_2026',
        APP_SIGNATURE_SECRET: 'ERP_ELECTRON_SECURE_KEY_2026_@ANTIGRAVITY#X'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(__dirname, 'logs', 'pm2-gateway-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-gateway-out.log'),
      merge_logs: true,
      time: true
    },

    // =========================================================================
    // 2. GSHUB SERVER-CORE (Pure gRPC Engine & System/Auth/Role :60051)
    // =========================================================================
    {
      name: 'gshub-core',
      script: process.platform === 'win32' ? './main.exe' : './main',
      cwd: path.join(__dirname, 'server-core', 'cmd', 'server'),
      exec_interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 2000,
      env: {
        APP_ENV: 'production',
        PORT_GRPC: 60051,
        POSTGRES_HOST: '127.0.0.1',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'AdminErp#',
        POSTGRES_DB: 'GsHub',
        POSTGRES_DB_LOGS: 'GsHub',
        POSTGRES_MAX_CONNS: '0',
        POSTGRES_MIN_CONNS: '0',
        JWT_SECRET: 'syscore_gshub_super_secret_jwt_key_2026',
        LOG_STORAGE: '../grafana-logs/logs'
      },
      env_development: {
        APP_ENV: 'development',
        PORT_GRPC: 60051,
        POSTGRES_HOST: '127.0.0.1',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'AdminErp#',
        POSTGRES_DB: 'GsHub',
        POSTGRES_DB_LOGS: 'GsHub',
        POSTGRES_MAX_CONNS: '0',
        POSTGRES_MIN_CONNS: '0',
        JWT_SECRET: 'syscore_gshub_dev_jwt_key_2026',
        LOG_STORAGE: '../grafana-logs/logs'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(__dirname, 'logs', 'pm2-core-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-core-out.log'),
      merge_logs: true,
      time: true
    },

    // =========================================================================
    // 3. GSHUB SERVICE-DATAHUB (Bravo ERP & Production Reports Engine :60052)
    // =========================================================================
    {
      name: 'gshub-datahub',
      script: process.platform === 'win32' ? './main.exe' : './main',
      cwd: path.join(__dirname, 'service-datahub'),
      exec_interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 2000,
      env: {
        APP_ENV: 'production',
        PORT: 9645,
        GRPC_PORT: 60052,
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'AdminErp#',
        DB_NAME: 'GsHub',
        DB_SSLMODE: 'disable',
        DB_MAX_OPEN_CONNS: '60',
        DB_MAX_IDLE_CONNS: '15',
        DB_CONN_MAX_LIFETIME_MINUTES: '30',
        JWT_SECRET: 'syscore_gshub_super_secret_jwt_key_2026',
        JWT_EXPIRE_HOURS: '72',

        // Đường dẫn Storage lưu file vật lý (.gsprod, báo cáo) - Đặt NGOÀI source code
        STORAGE_ROOT_PATH: process.env.STORAGE_ROOT_PATH || path.join(__dirname, '..', 'storage'),

        // Bravo ERP Integration
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
      env_development: {
        APP_ENV: 'development',
        PORT: 9645,
        GRPC_PORT: 60052,
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'AdminErp#',
        DB_NAME: 'GsHub',
        DB_SSLMODE: 'disable',
        DB_MAX_OPEN_CONNS: '25',
        DB_MAX_IDLE_CONNS: '10',
        DB_CONN_MAX_LIFETIME_MINUTES: '30',
        JWT_SECRET: 'syscore_gshub_dev_jwt_key_2026',
        JWT_EXPIRE_HOURS: '72',

        // Đường dẫn Storage lưu file vật lý (.gsprod, báo cáo) - Đặt NGOÀI source code
        STORAGE_ROOT_PATH: process.env.STORAGE_ROOT_PATH || path.join(__dirname, '..', 'storage'),

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
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(__dirname, 'logs', 'pm2-datahub-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-datahub-out.log'),
      merge_logs: true,
      time: true
    }
  ]
}
