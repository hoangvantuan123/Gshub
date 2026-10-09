/* eslint-disable react/prop-types */
import { useEffect } from 'react'
import TopLoadingBar from 'react-top-loading-bar'
import { useTranslation } from 'react-i18next'
import { forceUnlockPageInteraction } from '../../../utils/togglePageInteraction'

const LoadingBar =
  typeof TopLoadingBar === 'function'
    ? TopLoadingBar
    : typeof TopLoadingBar?.default === 'function'
      ? TopLoadingBar.default
      : null

export default function DataPageContainer({
  loadingBarRef,
  actions,
  query,
  table,
  queryTitle,
  defaultOpenQuery = true,
  children,
  className = ''
}) {
  const { t } = useTranslation()

  useEffect(() => {
    return () => {
      forceUnlockPageInteraction()
      loadingBarRef?.current?.complete?.()
    }
  }, [loadingBarRef])

  if (children) {
    return (
      <>
        {loadingBarRef && LoadingBar && <LoadingBar color="blue" height={2} ref={loadingBarRef} />}
        <div className={`bg-slate-50 h-full overflow-hidden ${className}`}>{children}</div>
      </>
    )
  }

  return (
    <>
      {loadingBarRef && LoadingBar && <LoadingBar color="blue" height={2} ref={loadingBarRef} />}
      <div className={`bg-slate-50 h-full overflow-hidden ${className}`}>
        <div className="flex flex-col h-full">
          <div className="w-full rounded-lg">
            {actions && (
              <div className="flex items-center justify-between bg-white px-2 py-0.5 border-b border-slate-200">
                {actions}
              </div>
            )}

            {query && (
              <details
                className="group [&_summary::-webkit-details-marker]:hidden bg-white"
                open={defaultOpenQuery}
              >
                <summary className="flex cursor-pointer items-center justify-between px-2 py-0.5 border-b border-slate-200 text-gray-900 select-none relative hover:bg-slate-50 transition-colors">
                  <h2 className="text-[10px] italic text-indigo-600 font-bold uppercase flex items-center gap-1.5 py-0.5">
                    <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
                    <span>{queryTitle || t('Điều kiện truy vấn')}</span>
                  </h2>
                </summary>
                {query}
              </details>
            )}
          </div>

          <div className="flex-1 min-h-0 w-full overflow-hidden">{table}</div>
        </div>
      </div>
    </>
  )
}
