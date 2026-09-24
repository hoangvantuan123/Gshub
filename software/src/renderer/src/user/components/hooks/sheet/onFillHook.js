import { useCallback } from 'react'

const useOnFill = (setGridData, cols) => {
  return useCallback(
    (start, end, data) => {
      setGridData((prevData) => {
        const newGridData = [...prevData]
        for (let row = start[1]; row <= end[1]; row++) {
          for (let col = start[0]; col <= end[0]; col++) {
            const columnKey = cols[col]?.id || ''
            if (!newGridData[row]) newGridData[row] = {}
            newGridData[row][columnKey] = data
          }
        }
        return newGridData
      })
    },
    [cols]
  )
}

export default useOnFill
