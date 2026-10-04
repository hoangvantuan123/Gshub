import * as XLSX from 'xlsx'

/**
 * Hàm làm sạch và ép kiểu chính xác cho từng giá trị ô khi xuất Excel
 */
export function formatCellForExcel(val, col = {}, formatDateFn = null) {
  if (val === undefined || val === null) return ''

  const colKey = col.id || col.key || ''
  const isNumberCol =
    col.kind === 'Number' ||
    colKey.includes('Qty') ||
    colKey.includes('Hours') ||
    colKey.includes('Rate') ||
    colKey.includes('Minute') ||
    colKey.includes('Total') ||
    colKey.includes('Output') ||
    colKey.includes('Speed') ||
    colKey.includes('Waste') ||
    colKey.includes('Pass') ||
    colKey.includes('Count') ||
    colKey.includes('Standard') ||
    colKey.includes('Actual')

  const isDateCol =
    colKey.endsWith('Date') ||
    colKey.includes('Time') ||
    colKey === 'ApplyDate' ||
    colKey === 'OpDate' ||
    colKey === 'StatDate' ||
    colKey === 'RoutingDocDate'

  // 1. Cột kiểu số: Chuẩn hóa thành Number thực để Excel tính toán được công thức
  if (isNumberCol || typeof val === 'number') {
    if (typeof val === 'number') return isNaN(val) ? 0 : val
    const cleanStr = String(val).replace(/,/g, '').trim()
    if (cleanStr === '') return ''
    const num = Number(cleanStr)
    return isNaN(num) ? cleanStr : num
  }

  // 2. Cột kiểu ngày tháng: Format dạng dd/MM/yyyy hoặc yyyy-MM-dd
  if (isDateCol && val) {
    if (typeof formatDateFn === 'function') {
      const formatted = formatDateFn(val)
      if (formatted) return formatted
    }
    const str = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10)
    }
    return str
  }

  // 3. Cột Boolean
  if (col.kind === 'Boolean' || typeof val === 'boolean') {
    const b =
      typeof val === 'boolean'
        ? val
        : val === 1 || val === '1' || val === 'true' || val === 'Có' || val === 'Y'
    return b ? 'Có' : ''
  }

  // 4. Cột trạng thái điều phối
  if (colKey === 'StatusDpSx') {
    const s = String(val).trim()
    if (s === 'P' || s === 'Đang chờ') return 'Đang chờ'
    if (s === 'R' || s === 'Đang chạy' || s === 'Đang SX') return 'Đang chạy'
    if (s === 'D' || s === 'Hoàn thành') return 'Hoàn thành'
    return s
  }

  // 5. Cột định mức Capa
  if (colKey === 'CapaStatus') {
    const s = String(val).trim()
    if (s === 'Khớp' || s === 'Y' || s === 'OK') return 'Khớp'
    if (s === 'Không khớp' || s === 'N') return 'Không khớp'
    return s
  }

  return String(val).trim()
}

/**
 * Tóm tắt điều kiện lọc thành chuỗi hiển thị trên tiêu đề báo cáo
 */
export function formatFilterSummary(filters = {}, formatDateFn = null) {
  if (!filters || typeof filters !== 'object') return ''

  const parts = []
  if (filters.FactoryName) parts.push(`Nhà máy: ${filters.FactoryName}`)
  if (filters.RegCode) parts.push(`Mã đợt ĐK: ${filters.RegCode}`)

  if (filters.FromDate && filters.ToDate) {
    const f = formatDateFn ? formatDateFn(filters.FromDate) : filters.FromDate
    const t = formatDateFn ? formatDateFn(filters.ToDate) : filters.ToDate
    parts.push(`Từ ngày ${f} đến ${t}`)
  } else if (filters.FromDate) {
    parts.push(`Từ ngày: ${formatDateFn ? formatDateFn(filters.FromDate) : filters.FromDate}`)
  } else if (filters.ToDate) {
    parts.push(`Đến ngày: ${formatDateFn ? formatDateFn(filters.ToDate) : filters.ToDate}`)
  }

  if (filters.ApplyDate) {
    parts.push(
      `Ngày áp dụng: ${formatDateFn ? formatDateFn(filters.ApplyDate) : filters.ApplyDate}`
    )
  }
  if (filters.OpDate) {
    parts.push(`Ngày SX: ${formatDateFn ? formatDateFn(filters.OpDate) : filters.OpDate}`)
  }
  if (filters.StatDate) {
    parts.push(`Ngày thống kê: ${formatDateFn ? formatDateFn(filters.StatDate) : filters.StatDate}`)
  }
  if (filters.MachineName) parts.push(`Máy: ${filters.MachineName}`)
  if (filters.OpTypeName) parts.push(`Công đoạn: ${filters.OpTypeName}`)
  if (filters.WorkShiftName) parts.push(`Ca: ${filters.WorkShiftName}`)
  if (filters.WorkerName) parts.push(`Công nhân: ${filters.WorkerName}`)
  if (filters.PicDp) parts.push(`PIC ĐP: ${filters.PicDp}`)
  if (filters.ItemCode) parts.push(`Mã SP: ${filters.ItemCode}`)
  if (filters.StatusDpSx) parts.push(`Trạng thái: ${filters.StatusDpSx}`)
  if (filters.CapaStatus) parts.push(`Định mức: ${filters.CapaStatus}`)
  if (filters.Keyword) parts.push(`Từ khóa: "${filters.Keyword}"`)

  return parts.length > 0 ? parts.join(' | ') : 'Tất cả dữ liệu'
}

function getFormattedNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * Xuất dữ liệu Grid sang file Excel (.xlsx) với định dạng biểu mẫu chuẩn ERP:
 * - Hàng 1: Tiêu đề báo cáo (in hoa, merge full chiều ngang)
 * - Hàng 2: Thời gian xuất & Điều kiện lọc áp dụng (merge full chiều ngang)
 * - Hàng 3 & 4: Nhóm cột (Group) và Tên cột chi tiết (2 tầng)
 * - Hàng 5+: Dòng dữ liệu chi tiết kèm cột STT tự động
 */
export function generateExcelWorkbook({
  data = [],
  columns = [],
  sheetName = 'Sheet1',
  reportTitle = '',
  filterInfo = '',
  includeHeaders = true,
  formatDateFn = null
}) {
  // Lọc bỏ các cột kỹ thuật
  const validCols = (columns || []).filter(
    (c) =>
      c.id !== 'WorkingTag' &&
      c.id !== 'isEdited' &&
      c.id !== 'Id' &&
      c.id !== 'IdRow' &&
      c.id !== 'IdSeq' &&
      c.id !== 'RowVersion' &&
      c.visible !== false
  )

  const hasGroup = validCols.some((c) => Boolean(c.group))
  const totalCols = validCols.length + 1 // +1 cho cột STT đầu tiên

  const colWidths = [
    8, // Cột STT
    ...validCols.map((c) => Math.max(String(c.title || c.id).length + 4, 12))
  ]

  const aoaRows = []
  const merges = []

  // ── 1. Hàng 1: Tiêu đề báo cáo lớn ──
  const titleText = (reportTitle || 'BÁO CÁO TRUY VẤN DỮ LIỆU CHI TIẾT').toUpperCase()
  const row1_Title = [titleText]
  aoaRows.push(row1_Title)
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } })

  // ── 2. Hàng 2: Thông tin ngày giờ xuất & Điều kiện lọc ──
  const timeStr = `Thời gian xuất: ${getFormattedNow()}`
  const filterStr = filterInfo ? ` | Điều kiện: ${filterInfo}` : ''
  const row2_SubInfo = [`${timeStr}${filterStr}`]
  aoaRows.push(row2_SubInfo)
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } })

  // ── 3. Hàng tiêu đề cột (Group Header + Column Header) ──
  if (includeHeaders !== false) {
    if (hasGroup) {
      const row3_Group = ['STT']
      const row4_ColName = ['STT']

      let currentGroup = null
      let groupStartIndex = -1

      validCols.forEach((col, idx) => {
        const colIdx = idx + 1 // STT ở cột 0
        const groupName = col.group || ''
        const colTitle = col.title || col.id

        row3_Group.push(groupName)
        row4_ColName.push(colTitle)

        if (groupName) {
          if (groupName !== currentGroup) {
            if (currentGroup && groupStartIndex !== -1 && colIdx - 1 > groupStartIndex) {
              merges.push({
                s: { r: 2, c: groupStartIndex },
                e: { r: 2, c: colIdx - 1 }
              })
            }
            currentGroup = groupName
            groupStartIndex = colIdx
          }
        } else {
          if (currentGroup && groupStartIndex !== -1 && colIdx - 1 > groupStartIndex) {
            merges.push({
              s: { r: 2, c: groupStartIndex },
              e: { r: 2, c: colIdx - 1 }
            })
          }
          currentGroup = null
          groupStartIndex = -1
          // Cột không có nhóm: merge dọc từ hàng 3 xuống hàng 4
          merges.push({
            s: { r: 2, c: colIdx },
            e: { r: 3, c: colIdx }
          })
        }
      })

      // Đóng nhóm cuối cùng nếu có
      if (currentGroup && groupStartIndex !== -1 && totalCols - 1 > groupStartIndex) {
        merges.push({
          s: { r: 2, c: groupStartIndex },
          e: { r: 2, c: totalCols - 1 }
        })
      }

      // Merge dọc cho cột STT
      merges.push({
        s: { r: 2, c: 0 },
        e: { r: 3, c: 0 }
      })

      aoaRows.push(row3_Group)
      aoaRows.push(row4_ColName)
    } else {
      const row3_ColName = ['STT', ...validCols.map((c) => c.title || c.id)]
      aoaRows.push(row3_ColName)
    }
  }

  // ── 4. Hàng dữ liệu chi tiết ──
  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue

    // Xử lý Group Header nếu người dùng đang gom nhóm trên grid
    if (row._isGroupHeader) {
      const groupDataRow = [r + 1, row._groupTitle || 'Nhóm']
      for (let c = 1; c < validCols.length; c++) {
        const col = validCols[c]
        if (col.id === 'PlanQty' && row._totalPlanQty !== undefined) {
          groupDataRow.push(Number(row._totalPlanQty) || 0)
        } else if (col.id === 'ActualQty' && row._totalActualQty !== undefined) {
          groupDataRow.push(Number(row._totalActualQty) || 0)
        } else {
          groupDataRow.push('')
        }
      }
      aoaRows.push(groupDataRow)
      continue
    }

    const dataRow = [row._displayIndex || r + 1]

    for (let c = 0; c < validCols.length; c++) {
      const col = validCols[c]
      const rawVal = row[col.id] ?? row[col.id.charAt(0).toLowerCase() + col.id.slice(1)]
      const cellVal = formatCellForExcel(rawVal, col, formatDateFn)

      dataRow.push(cellVal)

      // Cập nhật độ rộng cột tự động (+1 offset do có cột STT)
      const len = String(cellVal).length
      if (len + 3 > colWidths[c + 1]) {
        colWidths[c + 1] = Math.min(len + 3, 50)
      }
    }

    aoaRows.push(dataRow)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoaRows)

  // Thiết lập Merges và Cols cho Worksheet
  if (merges.length > 0) {
    ws['!merges'] = merges
  }
  ws['!cols'] = colWidths.map((w) => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  return wb
}

/**
 * Lưu Workbook ra file: Trực tiếp vào thư mục (Electron Desktop) hoặc Tải về (Web Browser)
 */
export async function saveWorkbookToFile(wb, fileName, saveDirectory = '', options = {}) {
  // 1. Môi trường Electron Desktop App: Ghi trực tiếp xuống ổ đĩa không qua hộp thoại
  try {
    if (window?.electron?.saveFileAbsolute) {
      let targetDir = saveDirectory ? String(saveDirectory).trim() : ''
      if (!targetDir && window?.electron?.getDefaultDownloadPath) {
        targetDir = await window.electron.getDefaultDownloadPath()
      }

      if (targetDir) {
        const sep = targetDir.includes('/') && !targetDir.includes('\\') ? '/' : '\\'
        const cleanDir = targetDir.replace(/[\\/]+$/, '')
        const fullPath = `${cleanDir}${sep}${fileName}`

        const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
        const res = await window.electron.saveFileAbsolute(fullPath, base64Data, {
          overwriteExisting: options?.overwriteExisting !== false
        })
        if (res && res.success) {
          return { success: true, filePath: res.filePath || fullPath, isNative: true }
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi khi lưu file qua Electron IPC:', err)
  }

  // 2. Môi trường Web Browser: Tự động tải file về thư mục Downloads của trình duyệt
  XLSX.writeFile(wb, fileName)
  return { success: true, filePath: fileName, isNative: false }
}
