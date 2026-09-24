import { notification } from 'antd'
import i18next from 'i18next'

const notificationStyle = {
  padding: '12px 12px',
  fontSize: 13
}

export function HandleSuccess(results = []) {
  if (!results || !results.length) return

  const resultA = results[0] || null
  const resultU = results[1] || null

  const hasA = !!resultA && resultA.success
  const hasU = !!resultU && resultU.success

  const formatMessage = (result) => {
    if (!result || !result.success) return null

    const rawMessages = Array.isArray(result.message)
      ? result.message
      : [result.message || 'Thành công']

    const messages = rawMessages.map((msg) => {
      const strMsg = String(msg || '')
      const translated = i18next.t(strMsg)
      return translated !== strMsg
        ? translated
        : i18next.t(`success.${strMsg}`, { defaultValue: strMsg })
    })

    return (
      <div>
        <ul className="list-disc pl-4 space-y-1">
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (hasA) {
    notification.success({
      message: <span className="font-medium opacity-85 text-sm">{i18next.t('Thông báo')}</span>,
      description: formatMessage(resultA),
      placement: 'topRight',
      style: notificationStyle
    })
  }

  if (hasU) {
    notification.success({
      message: <span className="font-medium opacity-85 text-sm">{i18next.t('Thông báo')}</span>,
      description: formatMessage(resultU),
      placement: 'topRight',
      style: notificationStyle
    })
  }

  if (!hasA && !hasU) {
    notification.success({
      message: <span className="font-medium opacity-85 text-sm">{i18next.t('Thông báo')}</span>,
      description: i18next.t('Thao tác thành công!'),
      placement: 'topRight',
      style: notificationStyle
    })
  }
}
