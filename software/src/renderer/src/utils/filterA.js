export const filterAndSelectColumnsA = (editedRows, columnsToSelect, status) => {
  const filteredRows = editedRows
    .filter((row) => row.status === status)
    .map((row) => {
      const selectedRow = {}
      let isValidRow = false

      columnsToSelect.forEach((col) => {
        if (row.updatedRow.hasOwnProperty(col)) {
          const value = row.updatedRow[col]

          if (value !== '' && value != null && col !== 'Id') {
            isValidRow = true
          }

          if (isValidRow) {
            selectedRow[col] = value
          }
        }
      })

      return isValidRow ? selectedRow : null
    })
    .filter((row) => row !== null)

  return filteredRows
}
