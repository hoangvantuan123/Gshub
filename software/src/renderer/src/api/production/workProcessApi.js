import axios from 'axios'
import { getDefaultDataHubUrl } from '../../config/serverConfig'
import { isSessionExpiredError, triggerSessionExpired } from '../../utils/sessionExpiredHelper'
import { accessToken, getEmployeeCode } from '../../services/tokenService'

const getApiUrl = () => getDefaultDataHubUrl()

/**
 * Gọi API DataHub tổng hợp 3 cURL Lệnh công đoạn (Master -> Detail -> TT Steps)
 * @param {Object} params
 * @param {string} params.doc_no - Mã lệnh công đoạn e.g. "CD05-0926-0009"
 * @param {string} [params.branch_code="A01"] - Mã chi nhánh/đơn vị
 * @param {string} [params.fiscal_year="2026"] - Năm tài chính
 * @param {boolean} [params.fetch_steps=true] - Lấy các bước công đoạn TT
 * @param {boolean} [params.include_raw=true] - Kèm raw response của Bravo
 * @param {string} [params.config_key="BravoDefault"] - Cấu hình ERP
 * @param {string} [params.username] - Tài khoản truy vấn
 * @returns {Promise<Object>}
 */
export async function queryWorkProcess({
  doc_no,
  stage_order_no,
  item_code,
  item_codes,
  item_name,
  item_names,
  unit,
  customer_name,
  factory_name,
  description,
  work_process_code,
  product_type_name,
  column_filters,
  raw_sse,
  branch_code = 'A01',
  fiscal_year = '2026',
  page = 0,
  page_size = 100,
  fetch_steps = true,
  include_raw = true,
  config_key = 'BravoDefault',
  menu_key = 'production_work_process',
  api_key = 'WorkDocCD',
  username = '',
  token = '',
  signal = null
}) {
  const activeToken = token || accessToken() || ''
  const activeUsername = username || getEmployeeCode() || ''

  const payload = {
    stage_order_no: stage_order_no?.trim() || undefined,
    doc_no: doc_no?.trim() || undefined,
    work_process_code: work_process_code?.trim() || undefined,
    product_type_name: product_type_name?.trim() || undefined,
    item_code: item_code?.trim() || undefined,
    item_codes: Array.isArray(item_codes) && item_codes.length > 0 ? item_codes : undefined,
    item_name: item_name?.trim() || undefined,
    item_names: Array.isArray(item_names) && item_names.length > 0 ? item_names : undefined,
    unit: unit?.trim() || undefined,
    customer_name: customer_name?.trim() || undefined,
    factory_name: factory_name?.trim() || undefined,
    description: description?.trim() || undefined,
    column_filters:
      column_filters && Object.keys(column_filters).length > 0 ? column_filters : undefined,
    raw_sse: raw_sse && Object.keys(raw_sse).length > 0 ? raw_sse : undefined,
    branch_code: branch_code || 'A01',
    fiscal_year: fiscal_year || String(new Date().getFullYear()),
    page: Number(page) || 0,
    page_size: Number(page_size) || 100,
    fetch_steps: fetch_steps !== false,
    include_raw: Boolean(include_raw),
    config_key: config_key || 'BravoDefault',
    menu_key: menu_key || 'production_work_process',
    api_key: api_key || 'WorkDocCD',
    username: activeUsername || undefined,
    token: activeToken || undefined
  }

  const startTime = Date.now()

  // Ưu tiên 1: Sử dụng kết nối gRPC siêu tốc qua Electron IPC (:9644)
  if (typeof window !== 'undefined' && window.electron?.datahub?.queryWorkProcess) {
    try {
      const grpcRes = await window.electron.datahub.queryWorkProcess(payload)
      const latency = grpcRes?.latency_ms || Date.now() - startTime

      if (grpcRes?.success) {
        let parsedData = null
        if (grpcRes.data_json) {
          try {
            parsedData = JSON.parse(grpcRes.data_json)
          } catch (e) {
            console.error('Lỗi parse data_json từ gRPC:', e)
          }
        }

        return {
          success: true,
          data: parsedData || {},
          message: grpcRes.message || 'Thành công (gRPC)',
          latency,
          raw: parsedData?.raw
        }
      }

      const errText = grpcRes?.error_message || grpcRes?.message || 'Lỗi truy vấn gRPC DataHub'
      if (isSessionExpiredError(errText)) {
        triggerSessionExpired(errText)
      }
      return {
        success: false,
        message: errText,
        error: grpcRes?.error_message,
        latency
      }
    } catch (grpcErr) {
      console.warn('gRPC DataHub call failed, fallback sang HTTP REST:', grpcErr)
      if (isSessionExpiredError(grpcErr)) {
        triggerSessionExpired(grpcErr.message)
      }
    }
  }

  // Ưu tiên 2: Fallback qua HTTP REST Gateway (:9643)
  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`
      headers['X-Access-Token'] = activeToken
    }
    if (activeUsername) {
      headers['X-Username'] = activeUsername
    }

    const response = await axios.post(`${getApiUrl()}/api/v1/work-process`, payload, {
      headers,
      timeout: 45000,
      signal
    })

    const latency = Date.now() - startTime

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Thành công (HTTP)',
        latency,
        raw: response.data.data?.raw
      }
    }

    const respErr = response.data?.message || response.data?.error || 'Không có dữ liệu trả về'
    if (isSessionExpiredError(respErr)) {
      triggerSessionExpired(respErr)
    }

    return {
      success: false,
      message: respErr,
      error: response.data?.error,
      latency
    }
  } catch (err) {
    const latency = Date.now() - startTime
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Không thể kết nối đến server DataHub (:9643)'

    if (isSessionExpiredError(errorMsg, err.response?.status)) {
      triggerSessionExpired(errorMsg)
    }

    return {
      success: false,
      message: errorMsg,
      error: err,
      latency
    }
  }
}

/**
 * Lấy danh sách nhà máy động từ Bravo ERP endpoint (hỗ trợ gRPC & HTTP fallback)
 * @returns {Promise<Array<{FactoryName: string, Id: number, ParentId: number}>>}
 */
export async function fetchWorkProcessFactories({
  config_key = 'BravoDefault',
  menu_key = 'production_work_process',
  api_key = 'WorkDocCD_Factory',
  username = '',
  token = '',
  branch_code = '',
  fiscal_year = ''
} = {}) {
  const activeToken = token || accessToken() || ''
  const activeUsername = username || getEmployeeCode() || ''

  // Ưu tiên gRPC
  if (typeof window !== 'undefined' && window.electron?.datahub?.getFactories) {
    try {
      const grpcRes = await window.electron.datahub.getFactories({
        config_key,
        menu_key,
        api_key,
        username: activeUsername,
        token: activeToken,
        branch_code,
        fiscal_year
      })

      if (grpcRes?.success) {
        if (grpcRes.data_json) {
          try {
            const list = JSON.parse(grpcRes.data_json)
            if (Array.isArray(list) && list.length > 0) return list
          } catch (_) {}
        }
        if (Array.isArray(grpcRes.factories) && grpcRes.factories.length > 0) {
          return grpcRes.factories.map((f) => ({
            Id: f.id,
            ParentId: f.parent_id,
            FactoryName: f.factory_name
          }))
        }
      } else if (grpcRes?.error_message) {
        if (isSessionExpiredError(grpcRes.error_message)) {
          triggerSessionExpired(grpcRes.error_message)
        }
      }
    } catch (err) {
      console.warn('gRPC getFactories failed, fallback sang HTTP:', err)
      if (isSessionExpiredError(err)) {
        triggerSessionExpired(err.message)
      }
    }
  }

  // Fallback HTTP REST
  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`
      headers['X-Access-Token'] = activeToken
    }
    if (activeUsername) {
      headers['X-Username'] = activeUsername
    }

    const response = await axios.post(
      `${DATAHUB_API_URL}/api/v1/work-process/factories`,
      {
        config_key,
        menu_key,
        api_key,
        username: activeUsername,
        token: activeToken,
        branch_code,
        fiscal_year
      },
      {
        headers,
        timeout: 15000
      }
    )
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data
    }
    return []
  } catch (err) {
    console.warn('Failed to load factories dynamically via POST:', err)
    const errText = err.response?.data?.message || err.response?.data?.error || err.message || ''
    if (isSessionExpiredError(errText, err.response?.status)) {
      triggerSessionExpired(errText)
    }
    return []
  }
}

export default {
  queryWorkProcess,
  fetchWorkProcessFactories
}
