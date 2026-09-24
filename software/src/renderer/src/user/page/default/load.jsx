import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const Spinner = () => {
  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden select-none animate-in fade-in-0 duration-100">
      {/* Top micro progress bar */}
      <div className="w-full h-[2px] bg-slate-200 overflow-hidden shrink-0">
        <div className="h-full bg-blue-600 animate-pulse w-2/3" />
      </div>

      {/* Top action bar skeleton */}
      <div className="h-10 bg-white border-b border-slate-200/90 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 bg-slate-100 rounded-[3px] animate-pulse" />
          <div className="h-6 w-16 bg-slate-100 rounded-[3px] animate-pulse" />
          <div className="h-6 w-16 bg-slate-100 rounded-[3px] animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 13 }} spin />} />
          <span className="text-[11px] font-medium">Đang tải giao diện...</span>
        </div>
      </div>

      {/* Query filter bar skeleton */}
      <div className="h-9 bg-white border-b border-slate-200/80 px-3 flex items-center gap-3 shrink-0">
        <div className="h-5 w-28 bg-slate-100 rounded-[2px] animate-pulse" />
        <div className="h-5 w-36 bg-slate-100 rounded-[2px] animate-pulse" />
        <div className="h-5 w-32 bg-slate-100 rounded-[2px] animate-pulse" />
      </div>

      {/* Main Grid content skeleton */}
      <div className="flex-1 bg-white p-3 flex flex-col gap-2 overflow-hidden m-2 rounded-[3px] border border-slate-200/80">
        <div className="h-7 bg-slate-100/80 rounded-[2px] w-full animate-pulse flex items-center px-2 gap-4">
          <div className="h-3.5 w-12 bg-slate-200/60 rounded-[2px]" />
          <div className="h-3.5 w-28 bg-slate-200/60 rounded-[2px]" />
          <div className="h-3.5 w-36 bg-slate-200/60 rounded-[2px]" />
          <div className="h-3.5 w-24 bg-slate-200/60 rounded-[2px]" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-6 bg-slate-50/70 rounded-[2px] w-full animate-pulse flex items-center px-2 gap-4"
          >
            <div className="h-3 w-8 bg-slate-200/40 rounded-[2px]" />
            <div className="h-3 w-32 bg-slate-200/40 rounded-[2px]" />
            <div className="h-3 w-40 bg-slate-200/40 rounded-[2px]" />
            <div className="h-3 w-20 bg-slate-200/40 rounded-[2px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Spinner
