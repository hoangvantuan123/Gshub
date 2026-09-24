import { useCallback } from 'react'
import { togglePageInteraction } from '../../utils/togglePageInteraction'
import { updateIndexNo } from '../components/sheet/js/updateIndexNo'

export const useDeleteGenericData = (loadingBarRef) => {
  const handleDelete = useCallback(
    async ({
      canDelete,
      setGridData,
      deleteFunction,
      selectedRows,
      setNumRows,
      setStatusMessage,
      resetTable = () => {},
      idKey = 'IdSeq',
      idxKey = 'IdxNo',
      loadingText = 'Đang xóa dữ liệu...',
      successText = 'Xóa dữ liệu thành công!',
      noSelectedText = 'Vui lòng chọn dòng cần xóa!',
      noPermissionText = 'Bạn không có quyền xóa dữ liệu!'
    }) => {
      if (!selectedRows || selectedRows.length === 0) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({ type: 'warning', text: noSelectedText })
        }
        return false
      }

      if (!canDelete) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({ type: 'warning', text: noPermissionText })
        }
        return false
      }

      // Trích xuất ID database hợp lệ (hỗ trợ cả idKey, Id, IdSeq, UserSeq)
      const getRowDbId = (row) => {
        if (!row) return null
        const val = row[idKey] ?? row.Id ?? row.IdSeq ?? row.UserSeq
        if (val === undefined || val === null) return null
        const strVal = String(val).trim()
        if (strVal === '' || strVal === '0' || strVal === 'undefined' || strVal === 'null') {
          return null
        }
        return val
      }

      const rowsDbToDelete = []
      const rowsLocalToRemove = []

      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i]
        if (!row) continue
        const dbId = getRowDbId(row)

        if (dbId !== null) {
          // TRƯỜNG HỢP 2: Dòng đã có trong Database (dù Status là '', 'U', 'E', hay 'D')
          rowsDbToDelete.push({
            ...row,
            [idKey]: dbId
          })
        } else {
          // TRƯỜNG HỢP 1: Dòng mới chưa lưu DB (Status 'A' hoặc 'E' do thêm mới bị lỗi)
          rowsLocalToRemove.push(row)
        }
      }

      // 1. NẾU CHỈ CÓ CÁC DÒNG LOCAL (chưa lưu vào DB) -> Xóa ngay lập tức trên RAM O(N)
      if (rowsDbToDelete.length === 0 && rowsLocalToRemove.length > 0) {
        const localIdxs = new Set(
          rowsLocalToRemove.map((row) => row[idxKey]).filter((x) => x !== undefined)
        )
        setGridData((prev) => {
          const updated = prev.filter((row) => !localIdxs.has(row[idxKey]))
          const final = updateIndexNo(updated)
          if (setNumRows) setNumRows(final.length)
          return final
        })
        resetTable()
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({
            type: 'success',
            text: `Đã xóa ${rowsLocalToRemove.length} dòng mới!`
          })
        }
        return true
      }

      // 2. NẾU CÓ CÁC DÒNG ĐÃ TỒN TẠI TRONG DB -> GỌI API DELETE
      if (rowsDbToDelete.length > 0 && deleteFunction) {
        if (typeof setStatusMessage === 'function') {
          setStatusMessage({ type: 'info', text: loadingText })
        }
        togglePageInteraction(true)
        loadingBarRef.current?.continuousStart()

        try {
          const payload = rowsDbToDelete.map((row) => ({ [idKey]: row[idKey] }))
          const response = await deleteFunction(payload)

          if (response && response.success) {
            const deletedDbIds = new Set(rowsDbToDelete.map((item) => String(item[idKey])))
            const localIdxs = new Set(
              rowsLocalToRemove.map((row) => row[idxKey]).filter((x) => x !== undefined)
            )

            setGridData((prev) => {
              const updated = prev.filter((row) => {
                const dbId = getRowDbId(row)
                if (dbId !== null && deletedDbIds.has(String(dbId))) return false
                if (row[idxKey] !== undefined && localIdxs.has(row[idxKey])) return false
                return true
              })
              const final = updateIndexNo(updated)
              if (setNumRows) setNumRows(final.length)
              return final
            })

            resetTable()
            if (typeof setStatusMessage === 'function') {
              setStatusMessage({ type: 'success', text: successText })
            }
            return true
          } else {
            const errorMsg = response?.message || 'Lỗi khi xóa dữ liệu!'
            if (typeof setStatusMessage === 'function') {
              setStatusMessage({ type: 'error', text: errorMsg })
            }
            return false
          }
        } catch (error) {
          const errorMsg = error.message || 'Đã xảy ra lỗi khi xóa!'
          if (typeof setStatusMessage === 'function') {
            setStatusMessage({ type: 'error', text: errorMsg })
          }
          return false
        } finally {
          loadingBarRef.current?.complete()
          togglePageInteraction(false)
        }
      }

      return false
    },
    [loadingBarRef]
  )

  return { handleDelete }
}
