import { useCallback } from 'react'
import { togglePageInteraction } from '../../../../utils/togglePageInteraction'
import { filterAndSelectColumnsRow } from '../../../../utils/filterUorA'
import { validateColumnsTrans } from '../../../../utils/validateColumns'
import { showWarningNotifiAorU } from '../../../page/default/notifiAorUUtils'
import { updateIndexNo } from '../../sheet/js/updateIndexNo'
import { HandleError } from '../../../page/default/handleError'

export const useHandleSaveGenericV1 = ({ canCreate, loadingBarRef }) => {
  const handleSaveGeneric = useCallback(
    async ({
      gridData,
      setGridData,
      resetTable,
      columnsU,
      columnsA,
      filterCols,
      requiredColumns,
      postA,
      postU,
      matchField = 'IdxNo'
    }) => {
      if (!canCreate) {
        togglePageInteraction(false)
        loadingBarRef.current?.complete()
        return false
      }

      togglePageInteraction(true)
      loadingBarRef.current?.continuousStart()

      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
      const userSeq = userInfo.UserSeq
      const now = new Date().toISOString()

      const resulU = filterAndSelectColumnsRow(gridData, ['Id', ...filterCols], 'U').map(
        (item) => ({
          ...item,
          UpdatedBy: userSeq,
          UpdatedAt: now
        })
      )
      const resulA = filterAndSelectColumnsRow(gridData, filterCols, 'A').map((item) => ({
        ...item,
        CreatedBy: userSeq,
        CreatedAt: now
      }))

      const validationMessage = validateColumnsTrans(
        [...resulU, ...resulA],
        [...columnsU, ...columnsA],
        requiredColumns
      )
      if (validationMessage !== true) {
        togglePageInteraction(false)
        loadingBarRef.current?.complete()
        showWarningNotifiAorU([validationMessage])
        return false
      }
      if (resulA.length === 0 && resulU.length === 0) {
        togglePageInteraction(false)
        loadingBarRef.current?.complete()
        return true
      }

      try {
        const promises = []
        if (resulA.length > 0) promises.push(postA(resulA))
        if (resulU.length > 0) promises.push(postU(resulU))

        const results = await Promise.all(promises)
        const isSuccess = results.every((result) => result.success)

        if (isSuccess) {
          const newData = results.flatMap((result) => result?.data || [])
          setGridData((prevGridData) => {
            const updatedGridData = prevGridData.map((item) => {
              const found = newData.find(
                (data) =>
                  String(data[matchField]) === String(item[matchField]) ||
                  (data.IdxNo && item.IdxNo && data.IdxNo === item.IdxNo)
              )
              return found
                ? {
                    ...item,
                    WorkingTag: '',
                    Status: '',
                    IdxNo: found.IdxNo || item.IdxNo,
                    Id: found.Id || item.Id
                  }
                : item
            })
            return updateIndexNo(updatedGridData)
          })
          resetTable()
        } else {
          HandleError(results)
        }
        return isSuccess
      } catch (error) {
        return false
      } finally {
        togglePageInteraction(false)
        loadingBarRef.current?.complete()
      }
    },
    [canCreate, loadingBarRef]
  )

  return handleSaveGeneric
}
