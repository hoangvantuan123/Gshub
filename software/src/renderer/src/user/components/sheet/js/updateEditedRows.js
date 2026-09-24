export const updateEditedRows = (prevEditedRows, row, updatedData, status) => {
  const existingIndex = prevEditedRows.findIndex((editedRow) => editedRow.rowIndex === row)

  const updatedRowData = {
    rowIndex: row,
    updatedRow: updatedData[row],
    status: status
  }

  if (existingIndex === -1) {
    return [...prevEditedRows, updatedRowData]
  } else {
    const updatedEditedRows = [...prevEditedRows]
    updatedEditedRows[existingIndex] = updatedRowData
    return updatedEditedRows
  }
}
