/* eslint-disable react/prop-types */
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const SidebarContent = ({ collapsed, toggleSidebar }) => {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={toggleSidebar}
        title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        className="inline-flex items-center justify-center size-6 rounded-[3px] text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
      >
        {collapsed ? (
          <PanelLeftOpen size={14} strokeWidth={1.75} />
        ) : (
          <PanelLeftClose size={14} strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}

export default SidebarContent
