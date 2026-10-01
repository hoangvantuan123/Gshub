import path from 'path'
import fs from 'fs'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

let datahubClient = null
let currentServerAddress = ''

function getProtoPath() {
  const serviceProto = path.resolve(process.cwd(), '../service/service-datahub/proto/datahub.proto')
  if (fs.existsSync(serviceProto)) return serviceProto

  const internalProto = path.resolve(__dirname, './proto/datahub.proto')
  if (fs.existsSync(internalProto)) return internalProto

  return path.resolve(process.cwd(), 'src/main/datahub/proto/datahub.proto')
}

export function getDataHubClient(customAddress = null) {
  const serverAddress =
    customAddress ||
    process.env.DATAHUB_GRPC_ADDR ||
    process.env.VITE_DATAHUB_GRPC_ADDR ||
    '127.0.0.1:9644'

  if (datahubClient && currentServerAddress === serverAddress) {
    return datahubClient
  }

  if (datahubClient) {
    try {
      datahubClient.close()
    } catch (_) {}
    datahubClient = null
  }

  currentServerAddress = serverAddress
  const protoPath = getProtoPath()

  if (!fs.existsSync(protoPath)) {
    throw new Error(`DataHub proto file not found at: ${protoPath}`)
  }

  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [path.dirname(protoPath)]
  })

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
  const datahubProto = protoDescriptor.datahub

  if (!datahubProto || !datahubProto.DataHubService) {
    throw new Error('DataHubService not found in loaded proto descriptor')
  }

  datahubClient = new datahubProto.DataHubService(
    serverAddress,
    grpc.credentials.createInsecure(),
    {
      'grpc.keepalive_time_ms': 60000,
      'grpc.keepalive_timeout_ms': 20000,
      'grpc.max_receive_message_length': 32 * 1024 * 1024,
      'grpc.max_send_message_length': 32 * 1024 * 1024
    }
  )

  return datahubClient
}

/**
 * Invoke QueryWorkProcess via gRPC
 */
export function queryWorkProcessGRPC(payload = {}) {
  return new Promise((resolve, reject) => {
    try {
      const client = getDataHubClient()
      const req = {
        doc_no: payload.doc_no || '',
        stage_order_no: payload.stage_order_no || '',
        work_process_code: payload.work_process_code || '',
        product_type_name: payload.product_type_name || '',
        item_code: payload.item_code || '',
        item_codes: Array.isArray(payload.item_codes) ? payload.item_codes : [],
        item_name: payload.item_name || '',
        item_names: Array.isArray(payload.item_names) ? payload.item_names : [],
        unit: payload.unit || '',
        customer_name: payload.customer_name || '',
        factory_name: payload.factory_name || '',
        description: payload.description || '',
        branch_code: payload.branch_code || 'A01',
        fiscal_year: payload.fiscal_year || String(new Date().getFullYear()),
        page: Number(payload.page) || 0,
        page_size: Number(payload.page_size) || 100,
        fetch_steps: payload.fetch_steps !== false,
        include_raw: Boolean(payload.include_raw),
        config_key: payload.config_key || 'BravoDefault',
        menu_key: payload.menu_key || 'production_work_process',
        api_key: payload.api_key || 'WorkDocCD',
        username: payload.username || '',
        column_filters_json:
          typeof payload.column_filters === 'object' && payload.column_filters !== null
            ? JSON.stringify(payload.column_filters)
            : payload.column_filters_json || '',
        raw_sse_json:
          typeof payload.raw_sse === 'object' && payload.raw_sse !== null
            ? JSON.stringify(payload.raw_sse)
            : payload.raw_sse_json || ''
      }
      client.QueryWorkProcess(req, (err, response) => {
        if (err) return reject(err)
        resolve(response)
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Invoke GetFactories via gRPC
 */
export function getFactoriesGRPC(payload = {}) {
  return new Promise((resolve, reject) => {
    try {
      const client = getDataHubClient()
      client.GetFactories(payload, (err, response) => {
        if (err) return reject(err)
        resolve(response)
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Đăng ký tất cả IPC handlers cho DataHub gRPC vào Electron Main Process
 */
export function setupDataHubIpc(ipcMain) {
  if (!ipcMain) return

  ipcMain.handle('datahub:query-work-process', async (_, payload) => {
    try {
      const response = await queryWorkProcessGRPC(payload)
      return { success: true, ...response }
    } catch (err) {
      return { success: false, error_message: err.message || String(err) }
    }
  })

  ipcMain.handle('datahub:get-factories', async (_, payload) => {
    try {
      const response = await getFactoriesGRPC(payload)
      return { success: true, ...response }
    } catch (err) {
      return { success: false, error_message: err.message || String(err) }
    }
  })
}

export default {
  getDataHubClient,
  queryWorkProcessGRPC,
  getFactoriesGRPC,
  setupDataHubIpc
}
