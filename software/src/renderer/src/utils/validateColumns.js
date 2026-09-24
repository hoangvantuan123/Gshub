export const validateColumns = (rows, columns, requiredColumns) => {
  const missingColumns = []

  for (let row of rows) {
    for (let column of columns) {
      if (requiredColumns.includes(column)) {
        const value = row[column]
        if (
          (typeof value === 'string' && value.trim() === '') ||
          (typeof value === 'number' && isNaN(value)) ||
          value == null
        ) {
          missingColumns.push(column)
        }
      }
    }
  }

  if (missingColumns.length > 0) {
    return `Cột ${[...new Set(missingColumns)].join(', ')} không được để trống!`
  }

  return true
}

export const validateColumnsTrans = (rows, columns, requiredColumns) => {
  const missingColumns = []

  const requiredColumnKeys = Object.values(requiredColumns)

  for (let row of rows) {
    for (let column of columns) {
      if (requiredColumnKeys.includes(column)) {
        const value = row[column]
        if (
          (typeof value === 'string' && value.trim() === '') ||
          (typeof value === 'number' && isNaN(value)) ||
          value == null
        ) {
          missingColumns.push(column)
        }
      }
    }
  }

  if (missingColumns.length > 0) {
    // Chuyển từ tên cột database về tiếng Việt để hiển thị lỗi
    const translatedColumns = [...new Set(missingColumns)].map(
      (col) => Object.keys(requiredColumns).find((key) => requiredColumns[key] === col) || col
    )
    return `Cột ${translatedColumns.join(', ')} không được để trống!`
  }

  return true
}
