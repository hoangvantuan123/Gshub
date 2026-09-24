import { notification } from 'antd'
import i18next from 'i18next'

const notificationStyle = {
  padding: '12px 12px',
  fontSize: 13
}

export function HandleError(results = []) {
  if (!results || !results.length) return

  const resultA = results[0] || null
  const resultU = results[1] || null

  const hasA = !!resultA && !resultA.success
  const hasU = !!resultU && !resultU.success

  const formatMessage = (result) => {
    if (!result || result.success) return null

    const rawMessages = Array.isArray(result.message)
      ? result.message
      : [result.message || 'Có lỗi xảy ra']

    const messages = rawMessages.map((msg) => {
      const strMsg = String(msg || '')
      const translated = i18next.t(strMsg)
      return translated !== strMsg
        ? translated
        : i18next.t(`error.${strMsg}`, { defaultValue: strMsg })
    })

    const reqId = result.requestId || ''

    return (
      <div>
        <ul className="list-disc pl-4 space-y-1">
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
        {reqId && (
          <div className="mt-2 pt-1 border-t border-gray-100 text-[11px] text-gray-400 select-all">
            Mã tra cứu:{' '}
            <code className="bg-gray-50 px-1 py-0.5 rounded text-gray-500">{reqId}</code>
          </div>
        )}
      </div>
    )
  }

  if (hasA) {
    notification.warning({
      message: <span className="font-medium opacity-85 text-sm">{i18next.t('Thông báo lỗi')}</span>,
      description: formatMessage(resultA),
      placement: 'topRight',
      style: notificationStyle
    })
  }

  if (hasU) {
    notification.warning({
      message: <span className="font-medium opacity-85 text-sm">{i18next.t('Thông báo lỗi')}</span>,
      description: formatMessage(resultU),
      placement: 'topRight',
      style: notificationStyle
    })
  }

  if (!hasA && !hasU) {
    notification.warning({
      message: <span className="font-medium opacity-85 text-sm">{i18next.t('Thông báo lỗi')}</span>,
      description: i18next.t('Có lỗi xảy ra. Vui lòng thử lại.'),
      placement: 'topRight',
      style: notificationStyle
    })
  }
}
