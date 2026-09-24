import { useCallback } from 'react'

const useDynamicFilter = (gridData, fieldsToTrack) => {
  const isValidEntry = useCallback(
    (item) => {
      return fieldsToTrack.some((field) => {
        const value = item[field]
        return (
          (typeof value === 'string' && value.trim() !== '') ||
          typeof value === 'boolean' ||
          typeof value === 'number'
        )
      })
    },
    [fieldsToTrack]
  )

  const filterValidEntries = useCallback(() => {
    return gridData.filter((item) => (item.WorkingTag || item.Status) === 'A' && isValidEntry(item))
  }, [gridData, isValidEntry])

  const findLastEntry = useCallback(
    (validEntries) => {
      return [...validEntries].reverse().find(isValidEntry) || null
    },
    [isValidEntry]
  )

  const findMissingIds = useCallback(
    (lastEntry) => {
      if (!lastEntry) return []
      const lastIndex = gridData.findIndex((item) => item.Id === lastEntry.Id)
      return gridData
        .slice(0, lastIndex)
        .filter((item) => !isValidEntry(item))
        .map((item) => item.Id)
        .filter((id) => id)
    },
    [gridData, isValidEntry]
  )

  return { filterValidEntries, findLastEntry, findMissingIds }
}

export default useDynamicFilter
