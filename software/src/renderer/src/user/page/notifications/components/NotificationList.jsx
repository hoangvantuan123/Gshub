/* eslint-disable react/prop-types */
import { FolderSearch } from 'lucide-react'
import NotificationItem from './NotificationItem'

export default function NotificationList({
  listRef,
  visibleData = [],
  selectedRecord,
  selectedCheckIds = new Set(),
  onSelectRecord,
  onToggleCheck,
  isLoading = false,
  appliedKeyword = '',
  onScroll
}) {
  return (
    <div
      ref={listRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white"
    >
      {isLoading && visibleData.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <span>Đang tải danh sách...</span>
        </div>
      ) : visibleData.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <FolderSearch size={32} className="text-slate-300 stroke-[1.5]" />
          <span className="font-semibold text-slate-600 text-xs">
            {appliedKeyword
              ? `Không tìm thấy mục phù hợp với "${appliedKeyword}"`
              : 'Chưa có thông báo nào trong hệ thống'}
          </span>
        </div>
      ) : (
        visibleData.map((item) => {
          const isSelected =
            Boolean(selectedRecord) &&
            item.id !== undefined &&
            item.id !== null &&
            String(selectedRecord.id) === String(item.id)
          const isChecked = selectedCheckIds.has(item.id)

          return (
            <NotificationItem
              key={item.id}
              item={item}
              isSelected={isSelected}
              isChecked={isChecked}
              onSelect={onSelectRecord}
              onToggleCheck={onToggleCheck}
            />
          )
        })
      )}
    </div>
  )
}
