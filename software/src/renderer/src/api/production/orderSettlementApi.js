import axios from 'axios'
import { BACKEND_DATAHUB_URL } from '../../config/serverConfig'
import { isSessionExpiredError, triggerSessionExpired } from '../../utils/sessionExpiredHelper'
import { accessToken, getEmployeeCode } from '../../services/tokenService'

const DATAHUB_API_URL = BACKEND_DATAHUB_URL || 'http://localhost:8080'

/**
 * Gọi API DataHub Quyết toán lệnh sản xuất (tổng hợp CD và DetailTT)
 * @param {Object} params
 * @param {string} [params.stage_order_no] - Mã lệnh công đoạn
 * @param {string} [params.item_code] - Mã mặt hàng
 * @param {Array<string>} [params.item_codes] - Danh sách mã mặt hàng
 * @param {string} [params.item_name] - Tên vật tư, hàng hóa
 * @param {Array<string>} [params.item_names] - Danh sách tên hàng hóa
 * @param {string} [params.operation_code] - Mã công đoạn thao tác TT
 * @param {string} [params.status] - Trạng thái quyết toán
 * @param {string} [params.factory_name] - Xưởng sản xuất
 * @param {string} [params.branch_code="A01"] - Mã chi nhánh/đơn vị
 * @param {string} [params.fiscal_year="2026"] - Năm tài chính
 * @param {number} [params.page=0] - Trang hiện tại
 * @param {number} [params.page_size=100] - Số dòng mỗi trang
 * @param {string} [params.config_key="BravoDefault"] - Cấu hình ERP
 * @param {string} [params.username] - Tài khoản truy vấn
 * @param {Object} [params.column_filters] - Bộ lọc cột dynamic
 * @param {Object} [params.raw_sse] - SSE payload
 * @param {boolean} [params.include_raw=false] - Trả về raw ERP data
 * @param {AbortSignal} [params.signal] - Signal hủy request
 * @returns {Promise<Object>}
 */
export async function queryOrderSettlement({
  stage_order_no,
  item_code,
  item_codes,
  item_name,
  item_names,
  operation_code,
  status,
  factory_name,
  branch_code = 'A01',
  fiscal_year = '2026',
  page = 0,
  page_size = 100,
  include_raw = false,
  config_key = 'BravoDefault',
  menu_key = 'production_order_settlement',
  api_key = 'WorkDocCD_Detail',
  username = '',
  token = '',
  column_filters,
  raw_sse,
  signal = null
}) {
  const activeToken = token || accessToken() || ''
  const activeUsername = username || getEmployeeCode() || ''

  const payload = {
    stage_order_no: stage_order_no?.trim() || undefined,
    item_code: item_code?.trim() || undefined,
    item_codes: Array.isArray(item_codes) && item_codes.length > 0 ? item_codes : undefined,
    item_name: item_name?.trim() || undefined,
    item_names: Array.isArray(item_names) && item_names.length > 0 ? item_names : undefined,
    operation_code: operation_code?.trim() || undefined,
    status: status?.trim() || undefined,
    factory_name: factory_name?.trim() || undefined,
    branch_code: branch_code || 'A01',
    fiscal_year: fiscal_year || String(new Date().getFullYear()),
    page: Number(page) || 0,
    page_size: Number(page_size) || 100,
    include_raw: Boolean(include_raw),
    config_key: config_key || 'BravoDefault',
    menu_key: menu_key || 'production_order_settlement',
    api_key: api_key || 'WorkDocCD_Detail',
    username: activeUsername || undefined,
    token: activeToken || undefined,
    column_filters:
      column_filters && Object.keys(column_filters).length > 0 ? column_filters : undefined,
    raw_sse: raw_sse && Object.keys(raw_sse).length > 0 ? raw_sse : undefined
  }

  const startTime = Date.now()

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

    const response = await axios.post(`${DATAHUB_API_URL}/api/v1/order-settlement`, payload, {
      headers,
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
      'Không thể kết nối đến server DataHub (:8080)'

    if (isSessionExpiredError(errorMsg, err.response?.status)) {
      triggerSessionExpired(errorMsg)
    }

    return {
      success: false,
      message: errorMsg,
      error: err.response?.data || err.message,
      latency
    }
  }
}
