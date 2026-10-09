/**
 * DataHub gRPC API Service for Production Calculation Compressed Bundles (.gsprod packages)
 * Đẩy gói siêu nén lên Server và tải/đồng bộ trực tiếp vào DB Cache máy nội bộ qua gRPC Gateway
 */
import axios from 'axios'
import { getDefaultDataHubUrl } from '../../config/serverConfig'
import { accessToken, getEmployeeCode } from '../../services/tokenService'
import { isSessionExpiredError, triggerSessionExpired } from '../../utils/sessionExpiredHelper'

const getApiUrl = () => getDefaultDataHubUrl()

/**
 * 1. Đẩy gói dữ liệu đã nén (.gsprod) lên Server DataHub qua gRPC Gateway (Pure POST)
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function publishProductionBundleOnline(payload) {
  const url = `${getApiUrl()}/api/v1/production-calc/bundles/PublishProductionBundle`
  const token = accessToken || ''
  const employeeCode = getEmployeeCode() || ''

  const finalPayload = {
    reg_code: payload.reg_code || payload.regCode,
    factory_name: payload.factory_name || payload.factoryName || 'GS1 Hà Nội',
    apply_date: payload.apply_date || payload.applyDate || '',
    production_team: payload.production_team || payload.productionTeam || 'Tất cả các tổ',
    status: payload.status || 'PUBLISHED',
    version: payload.version || '1.0',
    total_rows: payload.total_rows || payload.totalRows || 0,
    raw_size_mb: payload.raw_size_mb || payload.rawSizeMB || 0,
    compressed_size_mb: payload.compressed_size_mb || payload.compressedSizeMB || 0,
    compression_ratio: payload.compression_ratio || payload.compressionRatio || '',
    bundle_base64: payload.bundle_base64 || payload.bundleBase64 || '',
    file_summaries: typeof payload.file_summaries === 'string' ? payload.file_summaries : JSON.stringify(payload.file_summaries || payload.fileSummaries || {}),
    calc_summary: typeof payload.calc_summary === 'string' ? payload.calc_summary : JSON.stringify(payload.calc_summary || payload.calcSummary || {}),
    remark: payload.remark || '',
    created_by: payload.created_by || employeeCode || 'USER'
  }

  try {
    const response = await axios.post(url, finalPayload, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      timeout: 60000 // 60s
    })
    return response.data
  } catch (error) {
    if (isSessionExpiredError(error)) {
      triggerSessionExpired()
    }
    const msg = error.response?.data?.message || error.message || 'Lỗi đẩy gói lên Server DataHub qua gRPC'
    throw new Error(msg)
  }
}

/**
 * 2. Truy vấn danh sách các gói Online đã công bố trên Server DataHub qua gRPC Gateway (Pure POST)
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function queryProductionBundlesOnline(params = {}) {
  const url = `${getApiUrl()}/api/v1/production-calc/bundles/QueryProductionBundles`
  const token = accessToken || ''

  try {
    const response = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      timeout: 15000
    })
    return response.data
  } catch (error) {
    if (isSessionExpiredError(error)) {
      triggerSessionExpired()
    }
    const msg = error.response?.data?.message || error.message || 'Lỗi truy vấn gói từ Server DataHub'
    throw new Error(msg)
  }
}

/**
 * 3. Tải gói nhị phân (.gsprod) trực tiếp từ Server DataHub qua gRPC Gateway (Pure POST)
 * @param {string} regCode
 * @returns {Promise<Uint8Array>}
 */
export async function downloadProductionBundleOnline(regCode) {
  if (!regCode) throw new Error('regCode là bắt buộc để tải gói dữ liệu')

  const url = `${getApiUrl()}/api/v1/production-calc/bundles/GetProductionBundleData`
  const token = accessToken || ''

  try {
    const response = await axios.post(
      url,
      { reg_code: regCode, regCode },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        timeout: 30000
      }
    )

    const resData = response.data
    let rawBundle = resData?.bundle_data || resData?.bundleData || resData?.data

    if (typeof rawBundle === 'string') {
      // Decode Base64 string to Uint8Array
      const binaryString = atob(rawBundle)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    } else if (Array.isArray(rawBundle)) {
      return new Uint8Array(rawBundle)
    }

    return rawBundle
  } catch (error) {
    if (isSessionExpiredError(error)) {
      triggerSessionExpired()
    }
    const msg = error.response?.data?.message || error.message || 'Lỗi tải gói từ Server DataHub'
    throw new Error(msg)
  }
}

/**
 * 4. Xóa gói dữ liệu trên Server DataHub qua gRPC Gateway (Pure POST)
 * @param {string} regCode
 * @returns {Promise<Object>}
 */
export async function deleteProductionBundleOnline(regCode) {
  if (!regCode) throw new Error('regCode là bắt buộc để xóa')

  const url = `${getApiUrl()}/api/v1/production-calc/bundles/DeleteProductionBundle`
  const token = accessToken || ''

  try {
    const response = await axios.post(
      url,
      { reg_code: regCode, regCode },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        timeout: 15000
      }
    )
    return response.data
  } catch (error) {
    if (isSessionExpiredError(error)) {
      triggerSessionExpired()
    }
    const msg = error.response?.data?.message || error.message || 'Lỗi xóa gói trên Server DataHub'
    throw new Error(msg)
  }
}
