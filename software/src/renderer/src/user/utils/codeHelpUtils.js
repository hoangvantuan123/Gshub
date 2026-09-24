/**
 * codeHelpUtils.js
 * Chuẩn hóa tham số và luồng gọi CodeHelp trên toàn bộ Frontend ERP.
 *
 * Quy ước chuẩn:
 * - KeyType: Tên cột cần lọc ('ALL' | 'Key' | 'Label' | 'UserId' | 'UserName' | ...)
 * - KeyValue: Giá trị từ khóa lọc
 * - page, limit: Phân trang
 */

/**
 * Đóng gói tham số gửi lên API theo chuẩn ERP
 */
export function buildCodeHelpParams(
  keyword = '',
  searchColumn = 'ALL',
  page = 1,
  limit = 50,
  extraParams = {}
) {
  const cleanKeyword = String(keyword || '').trim()
  const cleanColumn = String(searchColumn || 'ALL').trim()

  const params = {
    KeyType: cleanColumn === 'ALL' ? 'ALL' : cleanColumn,
    KeyValue: cleanKeyword,
    page: String(page),
    limit: String(limit),
    ...extraParams
  }

  // Tương thích tối ưu 100% với Protobuf gRPC wire format:
  // Tự động map đúng vào trường protobuf tương ứng của cột được chọn
  if (cleanKeyword) {
    const colUpper = cleanColumn.toUpperCase()
    if (colUpper === 'ALL') {
      params.search = cleanKeyword
    } else if (
      colUpper === 'KEY' ||
      colUpper === 'CODE' ||
      colUpper === 'USERID' ||
      colUpper === 'EMPCODE'
    ) {
      params.KeyItem1 = cleanKeyword
    } else if (
      colUpper === 'LABEL' ||
      colUpper === 'NAME' ||
      colUpper === 'USERNAME' ||
      colUpper === 'EMPNAME'
    ) {
      params.KeyItem2 = cleanKeyword
    } else if (colUpper === 'ID' || colUpper === 'IDSEQ' || colUpper === 'MENUROOTID') {
      params.KeyItem3 = cleanKeyword
    } else {
      params[cleanColumn] = cleanKeyword
    }
  }

  return params
}

/**
 * Tạo nhanh hàm fetchHelpData cho bảng / modal
 */
export function createCodeHelpFetcher(apiFn, getExtraParams = null) {
  return async (searchText = '', page = 1, limit = 50, searchColumn = 'ALL', currentRow = null) => {
    try {
      const extraParams = typeof getExtraParams === 'function' ? getExtraParams(currentRow) : {}
      const params = buildCodeHelpParams(searchText, searchColumn, page, limit, extraParams)
      const res = await apiFn(params)
      return res?.data || res?.Data || res?.result || (Array.isArray(res) ? res : [])
    } catch (err) {
      console.error('CodeHelp fetch error:', err)
      return []
    }
  }
}


export async function fetchBatchCodeHelp(apiFn, textListOrSet, maxItems = 200) {
  const items = Array.isArray(textListOrSet)
    ? textListOrSet
    : textListOrSet instanceof Set
      ? Array.from(textListOrSet)
      : []

  if (!items || items.length === 0 || typeof apiFn !== 'function') {
    return []
  }

  const limitedItems = items.slice(0, maxItems)

  try {
    const res = await apiFn({
      KeyItem1: JSON.stringify(limitedItems),
      Keywords: limitedItems,
      Keyword: limitedItems.join(',')
    })
    return res?.data || res?.Data || []
  } catch (err) {
    console.error('fetchBatchCodeHelp error:', err)
    return []
  }
}
