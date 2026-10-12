/* eslint-disable react/prop-types */
export default function SystemTab() {
  const isElectron =
    typeof window !== 'undefined' &&
    Boolean(window.electron?.ipcRenderer || window.process?.type === 'renderer')

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 font-sans pb-20 pt-2 text-[#37352F] dark:text-[#E6E6E5]">
      {/* 1. NOTION PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#37352F] dark:text-[#E6E6E5]">
          Thông tin Phần mềm & Thiết bị
        </h1>
        <p className="text-sm text-[#787774] dark:text-[#9B9A97] leading-relaxed">
          Chi tiết phiên bản ứng dụng GsHub, nền tảng thực thi và thông số môi trường máy tính.
        </p>
      </div>

      <hr className="border-t border-[#EDEDEB] dark:border-[#2F2F2F]" />

      {/* 2. NOTION CALLOUT BOX */}
      <div className="p-4 rounded-md bg-[#F7F6F3] dark:bg-[#202020] border border-[#EDEDEB] dark:border-[#2F2F2F] flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
            {isElectron
              ? 'Ứng dụng GsHub Desktop (Windows App)'
              : 'Ứng dụng GsHub Web (Web Client)'}
          </div>
          <div className="text-[11.5px] text-[#787774] dark:text-[#9B9A97] font-mono mt-0.5">
            Phiên bản: v2.0.5 (Build Production x64)
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#107569] dark:text-[#15B79E] font-medium font-mono">
          <span className="w-2 h-2 rounded-full bg-[#107569] dark:bg-[#15B79E] animate-pulse" />
          <span>Sẵn sàng hoạt động</span>
        </div>
      </div>

      {/* 3. NOTION PROPERTIES LIST */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97]">
          Thông số Thiết bị & Hệ điều hành
        </h3>

        <div className="border border-[#EDEDEB] dark:border-[#2F2F2F] rounded-md divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F] bg-white dark:bg-[#191919]">
          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97]">Hệ thống:</span>
            <span className="font-mono text-[#37352F] dark:text-[#E6E6E5] font-medium">
              Microsoft Windows (x64)
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97]">Nền tảng thực thi:</span>
            <span className="font-mono text-[#37352F] dark:text-[#E6E6E5]">
              Desktop Native Engine • Electron 28 • Node.js
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97]">Số luồng xử lý CPU:</span>
            <span className="font-mono text-[#37352F] dark:text-[#E6E6E5] font-medium">
              {typeof navigator !== 'undefined'
                ? `${navigator.hardwareConcurrency || 4} Luồng`
                : 'N/A'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97]">Bộ nhớ RAM ước tính:</span>
            <span className="font-mono text-[#37352F] dark:text-[#E6E6E5] font-medium">
              {typeof navigator !== 'undefined' && navigator.deviceMemory
                ? `${navigator.deviceMemory} GB`
                : '8 GB+'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-[#F7F6F3] dark:hover:bg-[#202020] transition-colors">
            <span className="text-[#787774] dark:text-[#9B9A97]">Trạng thái kết nối:</span>
            <span className="font-mono text-[#107569] dark:text-[#15B79E] font-medium">
              {typeof navigator !== 'undefined' && navigator.onLine
                ? 'Trực tuyến (Online)'
                : 'Ngoại tuyến (Offline)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
