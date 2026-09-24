import { uuidv7 } from 'uuidv7'

export const generateEmptyData = (rowCount, defaultCols) => {
  return Array.from(
    {
      length: rowCount
    },
    () =>
      defaultCols.reduce(
        (row, col) => ({
          ...row,
          [col.id]: col.id === 'WorkingTag' || col.id === 'Status' ? 'A' : ''
        }),
        {
          Id: uuidv7(),
          WorkingTag: 'A',
          Status: 'A'
        }
      )
  )
}
