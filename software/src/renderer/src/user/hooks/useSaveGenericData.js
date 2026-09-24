import { useCallback } from 'react'
import { togglePageInteraction } from '../../utils/togglePageInteraction'
import { HandleError } from '../page/default/handleError'
import { updateIndexNo } from '../components/sheet/js/updateIndexNo'
import { filterValidRows } from '../../utils/filterUorA'

export const useSaveGenericData = (loadingBarRef) => {
  const handleSave = useCallback(
    async ({
      canCreate,
      gridData,
      setGridData,
      addFunction,
      updateFunction,
      userFrom,
      setStatusMessage,
      maxRowsPerSave = 3000,
      loadingText = 'Đang lưu dữ liệu...',
      successText = 'Lưu dữ liệu thành công!',
      matchKey = 'IdxNo',
      mapReturnedFields = (found) => ({ WorkingTag: '', Status: '', [matchKey]: found[matchKey] }),
      prepareAddRows = (rows) =>
        rows.map((item) => ({
          ...item,
          CreatedBy: userFrom?.UserSeq,
          UpdatedBy: userFrom?.UserSeq
        })),
      prepareUpdateRows = (rows) => rows.map((item) => ({ ...item, UpdatedBy: userFrom?.UserSeq }))
    }) => {
      if (!canCreate) return true

      // ── BƯỚC 1: QUÉT NHANH 1 PASS O(N) LỌC DÒNG CẦN LƯU VÀ CẮT TỐI ĐA 1500 DÒNG ──
      const isRowEmpty = (row) => {
        for (const k in row) {
          if (
            k === 'WorkingTag' ||
            k === 'Status' ||
            k === 'IdxNo' ||
            k === 'IndexNo' ||
            k === 'Id' ||
            k === 'IdRow' ||
            k === 'CreatedBy' ||
            k === 'CreatedByName' ||
            k === 'CreatedAt' ||
            k === 'UpdatedBy' ||
            k === 'UpdatedByName' ||
            k === 'UpdatedAt' ||
            k === 'RowVersion' ||
            k === 'Utilities' ||
            k === 'Active' ||
            k === 'isEdited' ||
            k === 'IsDefaultAllow' ||
            k === 'IsActive'
          ) {
            continue
          }
          const val = row[k]
          if (typeof val === 'boolean') {
            continue
          }
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return false
          }
        }
        return true
      }

      const rowsA = []
      const rowsU = []
      let totalPendingA = 0
      let totalPendingU = 0
      const len = gridData?.length || 0

      for (let i = 0; i < len; i++) {
        const row = gridData[i]
        if (!row) continue

        const status = row.WorkingTag || row.Status
        if (status === 'A') {
          // Bỏ qua các dòng trống mặc định chưa được người dùng nhập liệu
          if (!isRowEmpty(row)) {
            totalPendingA++
            if (rowsA.length + rowsU.length < maxRowsPerSave) {
              rowsA.push(row)
            }
          }
        } else if (status === 'U') {
          totalPendingU++
          if (rowsA.length + rowsU.length < maxRowsPerSave) {
            rowsU.push(row)
          }
        }
      }

      const totalPending = totalPendingA + totalPendingU
      const currentBatchCount = rowsA.length + rowsU.length
      const remainingAfterBatch = totalPending - currentBatchCount

      const resulA = prepareAddRows(rowsA)
      const resulU = prepareUpdateRows(rowsU)

      // Nếu không có bất kỳ dòng nào cần lưu -> Dừng ngay lập tức mà không phát bất kỳ thông báo "Đang lưu..." nào
      if (resulA.length === 0 && resulU.length === 0) {
        togglePageInteraction(false)
        loadingBarRef.current?.complete()
        return false
      }

      // CHỈ KHI CÓ DỮ LIỆU THỰC SỰ MỚI HIỂN THỊ "ĐANG LƯU..."
      const dynamicLoadingText =
        totalPending > maxRowsPerSave
          ? `Đang lưu đợt ${currentBatchCount.toLocaleString()} / ${totalPending.toLocaleString()} dòng...`
          : loadingText

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({ type: 'info', text: dynamicLoadingText })
      }
      togglePageInteraction(true)
      loadingBarRef.current?.continuousStart()

      try {
        let resA = null
        let resU = null

        if (resulA.length > 0 && addFunction) {
          resA = await addFunction(resulA)
        }

        if ((!resA || resA.success) && resulU.length > 0 && updateFunction) {
          resU = await updateFunction(resulU)
        }

        const safeExtractArray = (res) => {
          if (!res || !res.success || !res.data) return []
          return Array.isArray(res.data) ? res.data : [res.data]
        }

        const dataA = safeExtractArray(resA)
        const dataU = safeExtractArray(resU)

        // ── BƯỚC 2: XÂY DỰNG HASH MAP O(1) ĐỂ KHỚP DỮ LIỆU TỨC THÌ ──
        const mapAByIdx = new Map()
        const mapAByKey = new Map()
        for (let i = 0; i < dataA.length; i++) {
          const item = dataA[i]
          if (!item) continue
          if (item.IdxNo !== undefined) mapAByIdx.set(String(item.IdxNo), item)
          if (item.Key) mapAByKey.set(String(item.Key), item)
          if (matchKey && item[matchKey] !== undefined) mapAByIdx.set(String(item[matchKey]), item)
        }

        const mapUById = new Map()
        for (let i = 0; i < dataU.length; i++) {
          const item = dataU[i]
          if (!item) continue
          if (item.Id !== undefined && item.Id !== null && item.Id !== '')
            mapUById.set(String(item.Id), item)
          if (item.IdSeq !== undefined && item.IdSeq !== null && item.IdSeq !== '')
            mapUById.set(String(item.IdSeq), item)
          if (item.UserSeq !== undefined && item.UserSeq !== null && item.UserSeq !== '')
            mapUById.set(String(item.UserSeq), item)
        }

        // Xử lý thông báo trạng thái dưới status bottom
        const errorMessages = []

        // Trích xuất danh sách dòng lỗi trực tiếp từ cấu trúc dữ liệu chuẩn Backend trả về (data / error / errors)
        const errorRowIndices = new Set()
        const errorRowIds = new Set()

        const collectStructuredErrors = (res, defaultFallback) => {
          if (!res || res.success) return
          let rawData = res.data
          if (typeof rawData === 'string' && rawData.trim()) {
            try {
              rawData = JSON.parse(rawData)
            } catch (e) {
              // Ignore JSON parse error
            }
          }
          const details = Array.isArray(rawData)
            ? rawData
            : Array.isArray(res.errors)
              ? res.errors
              : Array.isArray(res.error?.details)
                ? res.error.details
                : res.error && typeof res.error === 'object'
                  ? [res.error]
                  : []

          let hasItemMsg = false
          for (let i = 0; i < details.length; i++) {
            const errItem = details[i]
            if (!errItem || typeof errItem !== 'object') continue
            const msg = errItem.Message || errItem.message
            if (msg) {
              errorMessages.push(msg)
              hasItemMsg = true
            }
            if (errItem.IdxNo !== undefined && errItem.IdxNo !== null) {
              errorRowIndices.add(Number(errItem.IdxNo))
            }
            if (errItem.idxNo !== undefined && errItem.idxNo !== null) {
              errorRowIndices.add(Number(errItem.idxNo))
            }
            if (errItem.Id !== undefined && errItem.Id !== null && errItem.Id !== '') {
              errorRowIds.add(String(errItem.Id))
            }
            if (errItem.id !== undefined && errItem.id !== null && errItem.id !== '') {
              errorRowIds.add(String(errItem.id))
            }
          }

          if (!hasItemMsg) {
            errorMessages.push(res.message || defaultFallback)
          }
        }

        collectStructuredErrors(resA, 'Lỗi thêm mới dữ liệu')
        collectStructuredErrors(resU, 'Lỗi cập nhật dữ liệu')

        // ── BƯỚC 3: CẬP NHẬT GRIDDATA BẰNG 1 PASS TUYẾN TÍNH O(N) ──
        setGridData((prev) => {
          let hasChanges = false
          let aSeqIdx = 0
          const updated = new Array(prev.length)
          for (let i = 0; i < prev.length; i++) {
            const item = prev[i]
            if (!item) {
              updated[i] = item
              continue
            }

            const rowIdx = item.IdxNo !== undefined ? Number(item.IdxNo) : i + 1
            const itemIdStr =
              item.Id !== undefined && item.Id !== null && item.Id !== '' ? String(item.Id) : null

            // Nếu dòng này nằm trong danh sách lỗi/xung đột có cấu trúc từ Backend trả về -> Đổi Status của đúng dòng đó về 'E'
            if (errorRowIndices.has(rowIdx) || (itemIdStr && errorRowIds.has(itemIdStr))) {
              updated[i] = {
                ...item,
                WorkingTag: 'E',
                Status: 'E'
              }
              hasChanges = true
              continue
            }

            const itemStatus = item.WorkingTag || item.Status

            // Xử lý dòng thêm mới (Status / WorkingTag: 'A') - Chỉ reset khi API Add thành công
            if (itemStatus === 'A' && resA && resA.success) {
              let found =
                (item.Key ? mapAByKey.get(String(item.Key)) : null) ||
                (item.IdxNo !== undefined ? mapAByIdx.get(String(item.IdxNo)) : null) ||
                (matchKey && item[matchKey] !== undefined
                  ? mapAByIdx.get(String(item[matchKey]))
                  : null)

              if (!found && aSeqIdx < dataA.length) {
                found = dataA[aSeqIdx]
              }
              aSeqIdx++

              if (found) {
                updated[i] = {
                  ...item,
                  ...mapReturnedFields(found),
                  Id: found.Id !== undefined ? found.Id : item.Id,
                  WorkingTag: '',
                  Status: ''
                }
                hasChanges = true
                continue
              }
            }

            // Xử lý dòng chỉnh sửa (Status / WorkingTag: 'U') - Chỉ reset khi API Update thành công
            if (itemStatus === 'U' && resU && resU.success) {
              const key = item.Id ?? item.IdSeq ?? item.UserSeq
              const found =
                key !== undefined && key !== null && key !== '' ? mapUById.get(String(key)) : null

              if (found) {
                updated[i] = {
                  ...item,
                  ...mapReturnedFields(found),
                  WorkingTag: '',
                  Status: ''
                }
                hasChanges = true
                continue
              }
            }

            // Mọi trường hợp còn lại: Giữ nguyên item và Status
            updated[i] = item
          }
          return hasChanges ? updateIndexNo(updated) : prev
        })

        if (errorMessages.length > 0) {
          if (typeof setStatusMessage === 'function') {
            setStatusMessage({ type: 'error', text: errorMessages.join(' | ') })
          }
          return false
        } else {
          if (typeof setStatusMessage === 'function') {
            const finalSuccessText =
              remainingAfterBatch > 0
                ? `Đã lưu thành công ${currentBatchCount.toLocaleString()} dòng! (Còn lại ${remainingAfterBatch.toLocaleString()} dòng chưa lưu, vui lòng tiếp tục bấm Lưu)`
                : successText
            setStatusMessage({ type: 'success', text: finalSuccessText })
          }
          return true
        }
      } catch (error) {
        const errorMsg = error.message || 'Đã xảy ra lỗi khi lưu!'
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({ type: 'error', text: errorMsg })
        }
        return false
      } finally {
        loadingBarRef.current?.complete()
        togglePageInteraction(false)
      }
    },
    [loadingBarRef]
  )

  return { handleSave }
}
