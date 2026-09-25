import axios from 'axios'
import { BACKEND_DATAHUB_URL } from '../../config/serverConfig'

const DATAHUB_API_URL = BACKEND_DATAHUB_URL || 'http://localhost:8080'

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
  item_code,
  item_codes,
  item_name,
  item_names,
  unit,
  customer_name,
  description,
  column_filters,
  raw_sse,
  branch_code = 'A01',
  fiscal_year = '2026',
  fetch_steps = true,
  include_raw = true,
  config_key = 'BravoDefault',
  username = '',
  signal = null
}) {
  const payload = {
    doc_no: doc_no?.trim() || undefined,
    item_code: item_code?.trim() || undefined,
    item_codes: Array.isArray(item_codes) && item_codes.length > 0 ? item_codes : undefined,
    item_name: item_name?.trim() || undefined,
    item_names: Array.isArray(item_names) && item_names.length > 0 ? item_names : undefined,
    unit: unit?.trim() || undefined,
    customer_name: customer_name?.trim() || undefined,
    description: description?.trim() || undefined,
    column_filters: column_filters && Object.keys(column_filters).length > 0 ? column_filters : undefined,
    raw_sse: raw_sse && Object.keys(raw_sse).length > 0 ? raw_sse : undefined,
    branch_code: branch_code || 'A01',
    fiscal_year: fiscal_year || String(new Date().getFullYear()),
    fetch_steps: fetch_steps !== false,
    include_raw: Boolean(include_raw),
    config_key: config_key || 'BravoDefault',
    username: username || undefined
  }

  const startTime = Date.now()

  try {
    const response = await axios.post(`${DATAHUB_API_URL}/api/v1/work-process`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 45000,
      signal
    })

    const latency = Date.now() - startTime

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Thành công',
        latency,
        raw: response.data.data?.raw
      }
    }

    return {
      success: false,
      message: response.data?.message || 'Không có dữ liệu trả về',
      error: response.data?.error,
      latency
    }
  } catch (err) {
    const latency = Date.now() - startTime
    const errorMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Không thể kết nối đến server DataHub (:8080)'

    return {
      success: false,
      message: errorMsg,
      error: err,
      latency
    }
  }
}

/**
 * Gọi API DataHub lấy danh sách Thao tác TT khi click vào 1 dòng Lệnh công đoạn chi tiết
 * @param {Object} params
 * @param {string} params.row_id - RowId của dòng Lệnh CĐ chi tiết e.g. "12262611CD"
 * @param {string} [params.branch_code="A01"]
 * @param {string} [params.fiscal_year="2026"]
 * @param {string} [params.config_key="BravoDefault"]
 * @param {string} [params.username]
 * @returns {Promise<Object>}
 */
export async function queryWorkProcessSteps({
  row_id,
  branch_code = 'A01',
  fiscal_year = '2026',
  config_key = 'BravoDefault',
  username = '',
  signal = null
}) {
  if (!row_id) {
    return { success: true, data: [] }
  }

  const payload = {
    row_id: String(row_id).trim(),
    branch_code: branch_code || 'A01',
    fiscal_year: fiscal_year || String(new Date().getFullYear()),
    config_key: config_key || 'BravoDefault',
    username: username || undefined
  }

  const startTime = Date.now()

  try {
    const response = await axios.post(`${DATAHUB_API_URL}/api/v1/work-process/steps`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 30000,
      signal
    })

    const latency = Date.now() - startTime

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message || 'Thành công',
        latency
      }
    }

    return {
      success: false,
      message: response.data?.message || 'Không thể lấy thao tác TT',
      error: response.data?.error,
      latency
    }
  } catch (err) {
    const latency = Date.now() - startTime
    return {
      success: false,
      message: err.response?.data?.message || err.message || 'Lỗi kết nối API Thao tác',
      error: err,
      latency
    }
  }
}

export default {
  queryWorkProcess,
  queryWorkProcessSteps
}
