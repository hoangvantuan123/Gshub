import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_AUD_LIMIT, getAudLimit, getQueryPagination } from '../configs/audConfig'
import { filterValidRows } from '../../utils/filterUorA'

export function useAudLimit({
  menuKey,
  defaultLimit = DEFAULT_AUD_LIMIT,
  customLimits = {},
  setStatusMessage,
  showModalError = true
} = {}) {
  const { t } = useTranslation()

  const [limitModal, setLimitModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    subMessage: '',
    type: 'warning'
  })

  const closeLimitModal = useCallback(() => {
    setLimitModal((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const getPagination = useCallback(() => {
    return getQueryPagination(menuKey, { defaultLimit, customLimits })
  }, [menuKey, defaultLimit, customLimits])

  const getLimit = useCallback(
    (actionType = 'SAVE') => {
      return getAudLimit(menuKey, actionType, { defaultLimit, customLimits })
    },
    [menuKey, defaultLimit, customLimits]
  )

  const notifyLimitExceeded = useCallback(
    ({ actionType = 'SAVE', currentCount = 0, maxLimit = DEFAULT_AUD_LIMIT, customMessage }) => {
      const actionLabelMap = {
        Q: t('truy vấn/tìm kiếm'),
        QUERY: t('truy vấn/tìm kiếm'),
        SEARCH: t('truy vấn/tìm kiếm'),
        A: t('thêm mới'),
        ADD: t('thêm mới'),
        U: t('cập nhật'),
        UPDATE: t('cập nhật'),
        D: t('xóa'),
        DELETE: t('xóa'),
        SAVE: t('lưu (Thêm/Sửa)'),
        AUD: t('thao tác'),
        QAUD: t('thao tác')
      }

      const actionText = actionLabelMap[String(actionType).toUpperCase()] || t('thao tác')
      const mainTitle = t('Thông báo vượt quá giới hạn')
      const mainMessage = t('Số lượng dòng {{action}} vượt quá giới hạn cho phép!', {
        action: actionText
      })
      const subMsg =
        customMessage ||
        t(
          'Thao tác hiện tại có {{current}} dòng, vượt quá giới hạn tối đa cho phép ({{max}} dòng). Vui lòng giảm bớt số lượng hoặc chia nhỏ để thực hiện!',
          {
            current: Number(currentCount).toLocaleString(),
            max: Number(maxLimit).toLocaleString()
          }
        )

      if (typeof setStatusMessage === 'function') {
        setStatusMessage({
          type: 'error',
          text: `${mainMessage} ${subMsg}`
        })
      }

      if (showModalError) {
        setLimitModal({
          isOpen: true,
          title: mainTitle,
          message: mainMessage,
          subMessage: subMsg,
          type: 'warning'
        })
      }

      return `${mainMessage} ${subMsg}`
    },
    [t, setStatusMessage, showModalError]
  )

  const checkLimit = useCallback(
    (actionType, countOrArray, options = {}) => {
      const count = Array.isArray(countOrArray) ? countOrArray.length : Number(countOrArray || 0)
      const maxLimit = options.limit || getLimit(actionType)

      if (count > maxLimit) {
        notifyLimitExceeded({
          actionType,
          currentCount: count,
          maxLimit,
          customMessage: options.customMessage
        })
        return false
      }

      return true
    },
    [getLimit, notifyLimitExceeded]
  )

  const validateQueryData = useCallback(
    (dataOrCount, options = {}) => {
      const count = Array.isArray(dataOrCount) ? dataOrCount.length : Number(dataOrCount || 0)
      const maxQueryLimit = options.maxQuery || getLimit('QUERY')

      if (count > maxQueryLimit) {
        notifyLimitExceeded({
          actionType: 'QUERY',
          currentCount: count,
          maxLimit: maxQueryLimit,
          customMessage: options.queryMessage
        })
        return false
      }

      return true
    },
    [getLimit, notifyLimitExceeded]
  )

  const validateSaveData = useCallback(
    ({ rowsA, rowsU, gridData, options = {} }) => {
      let pendingA = rowsA
      let pendingU = rowsU

      if ((!pendingA || !pendingU) && Array.isArray(gridData)) {
        pendingA = filterValidRows(gridData, 'A')
        pendingU = filterValidRows(gridData, 'U')
      }

      const countA = pendingA ? pendingA.length : 0
      const countU = pendingU ? pendingU.length : 0
      const totalSaveCount = countA + countU

      const maxSaveLimit = options.maxSave || getLimit('SAVE')
      const maxAddLimit = options.maxAdd || getLimit('ADD')
      const maxUpdateLimit = options.maxUpdate || getLimit('UPDATE')

      if (totalSaveCount > maxSaveLimit) {
        notifyLimitExceeded({
          actionType: 'SAVE',
          currentCount: totalSaveCount,
          maxLimit: maxSaveLimit,
          customMessage: options.saveMessage
        })
        return false
      }

      if (countA > maxAddLimit) {
        notifyLimitExceeded({
          actionType: 'ADD',
          currentCount: countA,
          maxLimit: maxAddLimit,
          customMessage: options.addMessage
        })
        return false
      }

      if (countU > maxUpdateLimit) {
        notifyLimitExceeded({
          actionType: 'UPDATE',
          currentCount: countU,
          maxLimit: maxUpdateLimit,
          customMessage: options.updateMessage
        })
        return false
      }

      return true
    },
    [getLimit, notifyLimitExceeded]
  )

  const validateDeleteData = useCallback(
    (selectedRowsOrCount, options = {}) => {
      const count = Array.isArray(selectedRowsOrCount)
        ? selectedRowsOrCount.length
        : Number(selectedRowsOrCount || 0)
      const maxDeleteLimit = options.maxDelete || getLimit('DELETE')

      if (count > maxDeleteLimit) {
        notifyLimitExceeded({
          actionType: 'DELETE',
          currentCount: count,
          maxLimit: maxDeleteLimit,
          customMessage: options.deleteMessage
        })
        return false
      }

      return true
    },
    [getLimit, notifyLimitExceeded]
  )

  const limitModalProps = useMemo(
    () => ({
      isOpen: limitModal.isOpen,
      title: limitModal.title,
      message: limitModal.message,
      subMessage: limitModal.subMessage,
      confirmText: t('Đã hiểu'),
      cancelText: t('Đóng'),
      type: limitModal.type || 'warning',
      onConfirm: closeLimitModal,
      onCancel: closeLimitModal
    }),
    [limitModal, closeLimitModal, t]
  )

  return {
    getLimit,
    getPagination,
    checkLimit,
    validateQueryData,
    validateSaveData,
    validateDeleteData,
    notifyLimitExceeded,
    limitModal,
    limitModalProps,
    closeLimitModal
  }
}
