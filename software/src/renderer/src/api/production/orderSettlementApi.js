import axios from 'axios'
import { getDefaultDataHubUrl } from '../../config/serverConfig'
import { isSessionExpiredError, triggerSessionExpired } from '../../utils/sessionExpiredHelper'
import { accessToken, getEmployeeCode, getBravoUserId } from '../../services/tokenService'

const getApiUrl = () => getDefaultDataHubUrl()

/**
 * Gọi API DataHub Quyết toán lệnh sản xuất (tổng hợp CD và DetailTT)
 * @param {Object} params
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
  from_date,
  to_date,
  date_range,
  factory_id,
  factory_id_tt,
  stt_ltt,
  item_id,
  dept_id,
  user_id,
  lang_id = 0,
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
  const activeUserId = user_id || getBravoUserId() || 1688

  let effFromDate = from_date?.trim() || undefined
  let effToDate = to_date?.trim() || undefined
  if (Array.isArray(date_range) && date_range.length === 2) {
    if (date_range[0]) effFromDate = String(date_range[0]).trim()
    if (date_range[1]) effToDate = String(date_range[1]).trim()
  }

  const payload = {
    stage_order_no: stage_order_no?.trim() || undefined,
    item_code: item_code?.trim() || undefined,
    item_codes: Array.isArray(item_codes) && item_codes.length > 0 ? item_codes : undefined,
    item_name: item_name?.trim() || undefined,
    item_names: Array.isArray(item_names) && item_names.length > 0 ? item_names : undefined,
    operation_code: operation_code?.trim() || undefined,
    status: status?.trim() || undefined,
    factory_name: factory_name?.trim() || undefined,
    from_date: effFromDate,
    to_date: effToDate,
    factory_id: factory_id || undefined,
    factory_id_tt: factory_id_tt || undefined,
    stt_ltt: stt_ltt?.trim() || undefined,
    item_id: item_id || undefined,
    dept_id: dept_id || undefined,
    user_id: activeUserId,
    lang_id: Number(lang_id) || 0,
    branch_code: branch_code || 'A01',
    fiscal_year: fiscal_year || String(new Date().getFullYear()),
    page: Number(page) || 0,
    page_size: Number(page_size) || 100,
    include_raw: Boolean(include_raw),
    config_key: config_key || 'BravoDefault',
    menu_key: menu_key || 'production_order_settlement',
    api_key: api_key || 'WorkDocCD_Detail',
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
    if (activeUserId) {
      headers['X-User-Id'] = String(activeUserId)
    }

    const response = await axios.post(`${getApiUrl()}/api/v1/order-settlement`, payload, {
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
      'Không thể kết nối đến server DataHub (:9643)'

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
