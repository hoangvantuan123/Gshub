/* eslint-disable react/prop-types, no-unused-vars */
import { Search, Copy } from 'lucide-react'
import { DataEditor } from '@glideapps/glide-data-grid'
import { PureButton, executiveGridTheme } from '../../hanoiGs1/stat/components/reportUIComponents'

export function DetailedDataGridSection({
  displayDetailList,
  reportType,
  currentPlantName,
  detailTotalProd,
  detailTotalPass,
  detailTotalMeters,
  detailTotalStdMeters,
  detailTotalRuntime,
  detailSearchText,
  setDetailSearchText,
  showDetailSearch,
  setShowDetailSearch,
  handleCopyGrid,
  handleExportExcel,
  detailGridRef,
  detailGridCols,
  getDetailCellContent,
  onDetailHeaderClicked,
  onDetailColumnResize
}) {
  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#0f172a'
          }}
        >
          <span>
            5. CHI TIẾT TOÀN BỘ PHIẾU SẢN XUẤT TOÀN TRÌNH (
            {displayDetailList.length.toLocaleString('vi-VN')} DÒNG)
          </span>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: '#475569',
            marginTop: 4,
            lineHeight: 1.5,
            maxWidth: 960
          }}
        >
          Bảng dữ liệu chi tiết toàn bộ{' '}
          <b>{displayDetailList.length.toLocaleString('vi-VN')} phiếu</b>{' '}
          {reportType === 'plan' ? 'kế hoạch điều phối' : 'thống kê tác nghiệp sản xuất'} tại{' '}
          {currentPlantName}. Hỗ trợ cuộn ảo mượt mà không giới hạn dòng, tự do co giãn cột, tìm
          kiếm nhanh (Ctrl+F) và sao chép dữ liệu.
        </div>
      </div>

      {/* Header toolbar & Tổng hợp số liệu chi tiết */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderBottom: 'none',
          padding: '6px 12px',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            color: '#334155',
            fontWeight: 700,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <span>
            Tổng SL Sản xuất:{' '}
            <b style={{ color: '#0f172a' }}>{detailTotalProd.toLocaleString('vi-VN')}</b>
          </span>
          <span>
            Tổng SL Đạt:{' '}
            <b style={{ color: '#01411b' }}>{detailTotalPass.toLocaleString('vi-VN')}</b>
          </span>
          {detailTotalMeters > 0 && (
            <span>
              Tổng Mét Thực tế:{' '}
              <b style={{ color: '#0f172a' }}>{detailTotalMeters.toLocaleString('vi-VN')}</b>
            </span>
          )}
          {detailTotalStdMeters > 0 && (
            <span>
              Tổng Mét Định mức:{' '}
              <b style={{ color: '#475569' }}>{detailTotalStdMeters.toLocaleString('vi-VN')}</b>
            </span>
          )}
          <span>
            Tổng giờ chạy: <b style={{ color: '#01411b' }}>{detailTotalRuntime.toFixed(1)}h</b>
          </span>
        </div>

        <div
          className="screenshot-hide"
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              border: '1px solid #94a3b8',
              background: '#ffffff',
              padding: '0 8px',
              gap: 6
            }}
          >
            <Search size={12} style={{ color: '#64748b' }} />
            <input
              type="text"
              placeholder="Lọc mã hàng, máy, tổ, số phiếu..."
              value={detailSearchText}
              onChange={(e) => setDetailSearchText(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 11.5, width: 170 }}
            />
          </div>

          <PureButton
            icon={<Search size={12} />}
            onClick={() => setShowDetailSearch((prev) => !prev)}
            title="Mở tìm kiếm nhanh trong bảng (Ctrl + F)"
            style={{
              borderColor: showDetailSearch ? '#01411b' : '#cbd5e1',
              color: showDetailSearch ? '#01411b' : '#334155',
              background: showDetailSearch ? '#f0fdf4' : '#ffffff'
            }}
          >
            Tìm trong lưới (Ctrl+F)
          </PureButton>
          <PureButton
            icon={<Copy size={12} />}
            onClick={handleCopyGrid}
            title="Sao chép toàn bộ dữ liệu bảng này vào Clipboard"
          >
            Sao chép
          </PureButton>
        </div>
      </div>

      {/* Glide Data Grid DataEditor Container */}
      <div
        style={{
          height: 520,
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          position: 'relative'
        }}
      >
        <DataEditor
          ref={detailGridRef}
          columns={detailGridCols}
          rows={displayDetailList.length}
          getCellContent={getDetailCellContent}
          onHeaderClicked={onDetailHeaderClicked}
          onColumnResize={onDetailColumnResize}
          getCellsForSelection={true}
          rangeSelect="rect"
          columnSelect="multi"
          rowSelect="multi"
          rowMarkers="both"
          rowHeight={23}
          headerHeight={23}
          smoothScrollX={true}
          smoothScrollY={true}
          showSearch={showDetailSearch}
          onSearchClose={() => setShowDetailSearch(false)}
          keybindings={{ search: true, downFill: true, rightFill: true }}
          theme={executiveGridTheme}
          width="100%"
          height="100%"
        />
      </div>
    </div>
  )
}
