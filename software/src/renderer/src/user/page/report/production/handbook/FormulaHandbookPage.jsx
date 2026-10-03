/* eslint-disable react/prop-types */
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { FormulaHandbookSheet } from './FormulaHandbookSheet'

export default function FormulaHandbookPage() {
  const location = useLocation()

  const defaultReportType = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || window.location.search)
      return params.get('type') || 'all'
    } catch {
      return 'all'
    }
  }, [location.search])

  return (
    <div className="w-full h-full min-h-0 flex-1 overflow-hidden flex flex-col bg-white">
      <FormulaHandbookSheet isStandalone={true} defaultReportType={defaultReportType} />
    </div>
  )
}
