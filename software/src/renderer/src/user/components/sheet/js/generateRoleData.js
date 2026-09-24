import { uuidv7 } from 'uuidv7'

export const generateRoleData = (rowCount, defaultCols) => {
  return Array.from(
    {
      length: rowCount
    },
    () =>
      defaultCols.reduce(
        (row, col) => ({
          ...row,
          [col.id]: col.id === 'Status' ? 'A' : ''
        }),
        {
          IdRow: uuidv7()
        }
      )
  )
}
