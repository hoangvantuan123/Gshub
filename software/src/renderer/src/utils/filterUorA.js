export const filterAndSelectColumns = (editedRows, columnsToSelect, status) => {
  const filteredRows = (editedRows || [])
    .filter((row) => (row.WorkingTag || row.Status) === status)
    .map((row) => {
      const selectedRow = {}
      let isValidRow = false

      columnsToSelect.forEach((col) => {
        if (row.hasOwnProperty(col)) {
          const value = row[col]

          if (
            col !== 'Id' &&
            col !== 'IdRow' &&
            col !== 'WorkingTag' &&
            col !== 'Status' &&
            col !== 'IdxNo'
          ) {
            if (value !== '' && value != null) {
              isValidRow = true
            }
          }

          selectedRow[col] = value
        }
      })

      return isValidRow ? selectedRow : null
    })
    .filter((row) => row !== null)

  return filteredRows
}

export const filterValidRows = (editedRows, status) => {
  const filteredRows = (editedRows || [])
    .filter((row) => (row.WorkingTag || row.Status) === status)
    .map((row) => {
      const selectedRow = {}
      let isValidRow = false

      Object.keys(row).forEach((col) => {
        if (
          col !== 'Id' &&
          col !== 'IdRow' &&
          col !== 'CreatedBy' &&
          col !== 'CreatedByName' &&
          col !== 'CreatedAt' &&
          col !== 'UpdatedBy' &&
          col !== 'UpdatedByName' &&
          col !== 'UpdatedAt' &&
          col !== 'isEdited' &&
          col !== 'WorkingTag' &&
          col !== 'Status' &&
          col !== 'IdxNo' &&
          col !== 'IndexNo' &&
          col !== 'RowVersion' &&
          col !== 'IsDefaultAllow' &&
          col !== 'IsActive' &&
          col !== 'Active'
        ) {
          const value = row[col]

          if (typeof value !== 'boolean' && value !== '' && value != null) {
            isValidRow = true
          }
        }
        selectedRow[col] = row[col]
      })

      return isValidRow ? selectedRow : null
    })
    .filter((row) => row !== null)

  return filteredRows
}

export const getRowsByStatus = (rows, statuses) => {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const statusList = Array.isArray(statuses) ? statuses : [statuses]

  return rows
    .filter((row) => statusList.includes(row.WorkingTag || row.Status))
    .map((row) => {
      const result = {}
      let isValid = false

      for (const key in row) {
        // bỏ các field hệ thống
        if (
          key === 'Id' ||
          key === 'IdRow' ||
          key === 'CreatedBy' ||
          key === 'UpdatedBy' ||
          key === 'isEdited' ||
          key === 'WorkingTag' ||
          key === 'Status' ||
          key === 'IdxNo'
        ) {
          continue
        }

        const value = row[key]

        if (value !== '' && value !== null && value !== undefined) {
          isValid = true
        }

        result[key] = value
      }

      // vẫn giữ WorkingTag & Status nếu cần gửi backend
      result.WorkingTag = row.WorkingTag || row.Status
      result.Status = row.Status || row.WorkingTag
      result.IdSeq = row.IdSeq

      return isValid ? result : null
    })
    .filter(Boolean)
}

export const filterValidRowsRootMenu = (editedRows, status) => {
  const filteredRows = (editedRows || [])
    .filter((row) => (row.WorkingTag || row.Status) === status)
    .map((row) => {
      const selectedRow = {}
      let isValidRow = false

      Object.keys(row).forEach((col) => {
        if (
          col !== 'IdRow' &&
          col !== 'Id' &&
          col !== 'CreatedBy' &&
          col !== 'UpdatedBy' &&
          col !== 'isEdited' &&
          col !== 'WorkingTag' &&
          col !== 'Status' &&
          col !== 'IdxNo'
        ) {
          const value = row[col]

          if (value !== '' && value != null) {
            isValidRow = true
          }
        }
        selectedRow[col] = row[col]
      })

      return isValidRow ? selectedRow : null
    })
    .filter((row) => row !== null)

  return filteredRows
}

export const filterAndSelectColumnsRow = (editedRows, columnsToSelect, status) => {
  const filteredRows = (editedRows || [])
    .filter((row) => (row.WorkingTag || row.Status) === status)
    .map((row) => {
      const selectedRow = {}
      let isValidRow = false

      columnsToSelect.forEach((col) => {
        if (row.hasOwnProperty(col)) {
          const value = row[col]
          if (
            col !== 'IdRow' &&
            col !== 'Id' &&
            col !== 'WorkingTag' &&
            col !== 'Status' &&
            col !== 'IdxNo'
          ) {
            if (value !== '' && value != null) {
              isValidRow = true
            }
          }

          selectedRow[col] = value
        }
      })

      return isValidRow ? selectedRow : null
    })
    .filter((row) => row !== null)

  return filteredRows
}
