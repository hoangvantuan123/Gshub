/* eslint-disable react/prop-types */
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { Tag, Spin, Drawer, Checkbox } from 'antd'
import { TableOutlined, NodeIndexOutlined, LoadingOutlined, HolderOutlined } from '@ant-design/icons'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import { useDateFormat } from '../../../../hooks/useDateFormat'
import WorkProcessDetailHeader from './WorkProcessDetailHeader'

const NUMBER_KEYS = new Set([
  'BuiltinOrder',
  'StepCount',
  'QuantitySO',
  'QuantityCDIssue',
  'QuantityProduce',
  'QuantityPass',
  'QuantityTransfered',
  'QuantityProductTransfered'
])
const DATE_KEYS = new Set(['DocDate', 'CreatedDate', 'CreatedAt', 'ModifiedDate', 'EditDate', 'ModifiedAt', 'CreateDate'])

export default function WorkProcessTable({
  masterList = [],
  setMasterList,
  masterCols = [],
  setMasterCols,
  defaultMasterCols = [],
  masterSelection,
  setMasterSelection,
  selectedMasterRow,
  currentStepData = [],
  stepCols = [],
  setStepCols,
  defaultStepCols = [],
  stepSelection,
  setStepSelection,
  loadingSteps = false,
  showSearch,
  setShowSearch,
  canEdit = false,
  canCreate = false,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()

  const masterGridRef = useRef(null)
  const stepGridRef = useRef(null)
  const containerRef = useRef(null)

  // 1. Resizable Splitter State (Kéo co giãn độ cao 2 bảng)
  const [topHeightPercent, setTopHeightPercent] = useState(50)
  const isDraggingRef = useRef(false)

  const handleSplitterMouseDown = useCallback((e) => {
    isDraggingRef.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const offsetY = moveEvent.clientY - rect.top
      const newPercent = Math.min(Math.max((offsetY / rect.height) * 100, 20), 80)
      setTopHeightPercent(newPercent)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  // Table Manager for Master Table
  const masterManager = useTableManager({
    tableId: 'work_process_master',
    defaultCols: defaultMasterCols,
    cols: masterCols,
    setCols: setMasterCols,
    setGridData: setMasterList,
    gridData: masterList,
    selection: masterSelection,
    setSelection: setMasterSelection,
    canEdit,
    canCreate,
    setShowSearch,
    onAddQueryField
  })

  // Table Manager for Step Table
  const stepManager = useTableManager({
    tableId: 'work_process_steps',
    defaultCols: defaultStepCols,
    cols: stepCols,
    setCols: setStepCols,
    setGridData: () => {},
    gridData: currentStepData,
    selection: stepSelection,
    setSelection: setStepSelection,
    canEdit,
    canCreate,
    setShowSearch,
    onAddQueryField
  })

  // Format Helper
  const formatDisplayDate = useCallback(
    (rawVal) => {
      if (!rawVal) return ''
      try {
        if (typeof rawVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawVal)) {
          const [y, m, d] = rawVal.split('T')[0].split('-')
          return `${d}/${m}/${y}`
        }
        return formatDateTime(rawVal) || String(rawVal)
      } catch {
        return String(rawVal)
      }
    },
    [formatDateTime]
  )

  // Cell Content Provider cho Bảng MASTER
  const getMasterCellContent = useCallback(
    ([colIdx, rowIdx]) => {
      const col = masterCols[colIdx]
      if (!col) return { kind: GridCellKind.Loading, allowOverlay: false }

      const row = masterList[rowIdx]
      if (!row) return { kind: GridCellKind.Loading, allowOverlay: false }

      let rawVal = row[col.id]
      if (rawVal == null || rawVal === '') {
        if (col.id === 'CreatedBy_Name') {
          rawVal = row.CreatedBy_Name ?? row.CreatedByName ?? row.CreatedBy ?? row.Creator ?? row.CreateBy_Name ?? row.CreateBy ?? ''
        } else if (col.id === 'ModifiedBy_Name') {
          rawVal = row.ModifiedBy_Name ?? row.ModifiedByName ?? row.ModifiedBy ?? row.EditBy_Name ?? row.EditBy ?? row.Editor ?? ''
        } else if (col.id === 'ModifiedDate') {
          rawVal = row.ModifiedDate ?? row.EditDate ?? row.ModifiedAt ?? row.UpdateDate ?? ''
        } else if (col.id === 'DocDate') {
          rawVal = row.DocDate ?? row.CreatedDate ?? row.CreateDate ?? row.CreatedAt ?? ''
        }
      }

      if (col.id === 'WorkingTag') {
        return {
          kind: GridCellKind.Text,
          data: `${rowIdx + 1}`,
          displayData: `${rowIdx + 1}`,
          allowOverlay: false,
          readonly: true,
          themeOverride: { textDark: '#2563eb', baseFontStyle: '600 11px Inter, sans-serif' }
        }
      }

      if (DATE_KEYS.has(col.id)) {
        const display = formatDisplayDate(rawVal)
        return {
          kind: GridCellKind.Text,
          data: String(rawVal || ''),
          displayData: display,
          allowOverlay: false,
          readonly: true
        }
      }

      if (NUMBER_KEYS.has(col.id)) {
        const num = rawVal != null && rawVal !== '' ? Number(rawVal) : null
        const display = num != null && !isNaN(num) ? num.toLocaleString('vi-VN') : (col.id === 'StepCount' ? '-' : '')
        return {
          kind: GridCellKind.Number,
          data: num ?? 0,
          displayData: display,
          allowOverlay: false,
          readonly: true,
          themeOverride:
            col.id === 'QuantityProduce'
              ? { textDark: '#15803d', baseFontStyle: '600 12px Inter, sans-serif' }
              : col.id === 'QuantityPass'
              ? { textDark: '#1d4ed8', baseFontStyle: '600 12px Inter, sans-serif' }
              : undefined
        }
      }

      const strVal = rawVal != null ? String(rawVal) : ''
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        allowOverlay: false,
        readonly: true,
        themeOverride: col.themeOverride
      }
    },
    [masterCols, masterList, formatDisplayDate]
  )

  // Cell Content Provider cho Bảng DETAIL STEPS
  const getStepCellContent = useCallback(
    ([colIdx, rowIdx]) => {
      const col = stepCols[colIdx]
      if (!col) return { kind: GridCellKind.Loading, allowOverlay: false }

      const row = currentStepData[rowIdx]
      if (!row) return { kind: GridCellKind.Loading, allowOverlay: false }

      const rawVal = row[col.id]

      if (col.id === 'WorkingTag') {
        return {
          kind: GridCellKind.Text,
          data: `${rowIdx + 1}`,
          displayData: `${rowIdx + 1}`,
          allowOverlay: false,
          readonly: true,
          themeOverride: { textDark: '#7c3aed', baseFontStyle: '600 11px Inter, sans-serif' }
        }
      }

      if (NUMBER_KEYS.has(col.id)) {
        const num = rawVal != null && rawVal !== '' ? Number(rawVal) : null
        const display = num != null && !isNaN(num) ? num.toLocaleString('vi-VN') : ''
        return {
          kind: GridCellKind.Number,
          data: num ?? 0,
          displayData: display,
          allowOverlay: false,
          readonly: true,
          themeOverride:
            col.id === 'QuantityProduce'
              ? { textDark: '#15803d', baseFontStyle: '600 12px Inter, sans-serif' }
              : col.id === 'QuantityPass'
              ? { textDark: '#1d4ed8', baseFontStyle: '600 12px Inter, sans-serif' }
              : undefined
        }
      }

      const strVal = rawVal != null ? String(rawVal) : ''
      return {
        kind: GridCellKind.Text,
        data: strVal,
        displayData: strVal,
        allowOverlay: false,
        readonly: true,
        themeOverride: col.themeOverride
      }
    },
    [stepCols, currentStepData]
  )

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden bg-white select-none relative">
      {/* ── BẢNG 1: MASTER (LỆNH CÔNG ĐOẠN) ── */}
      <div
        style={{ height: `calc(${topHeightPercent}% - 4px)` }}
        className="flex flex-col min-h-[120px] bg-white overflow-hidden"
      >
        <div className="flex items-center justify-between px-2.5 py-0.5 bg-[#eaedf1] border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <TableOutlined className="text-blue-600 text-xs" />
            <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wide">
              Lệnh Công Đoạn
            </span>
            <Tag color="blue" className="text-[10px] font-semibold leading-none px-1.5 py-0.5 m-0 rounded-none">
              {masterList.length} Lệnh
            </Tag>
          </div>
          {selectedMasterRow && (
            <div className="text-[11px] text-slate-600 truncate max-w-[60%]">
              Đang chọn:{' '}
              <span className="font-semibold text-blue-700">{selectedMasterRow.StageOrderNo}</span>
              {selectedMasterRow.ItemName && (
                <span className="text-slate-500 italic"> ({selectedMasterRow.ItemName})</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 w-full h-full relative">
          <DataEditor
            ref={masterGridRef}
            columns={masterCols}
            rows={masterList.length}
            getCellContent={getMasterCellContent}
            gridSelection={masterSelection}
            onGridSelectionChange={setMasterSelection}
            smoothScrollX
            smoothScrollY
            getCellsForSelection
            theme={masterManager.gridTheme}
            rowMarkers="both"
            rowMarkerWidth={36}
            rowHeight={26}
            headerHeight={28}
            width="100%"
            height="100%"
            showSearch={showSearch}
            onSearchClose={onSearchClose}
            onKeyDown={masterManager.onKeyDown}
            onColumnMoved={masterManager.onColumnMoved}
            onColumnResize={masterManager.onColumnResize}
            onHeaderMenuClick={masterManager.onHeaderMenuClick}
            onCellContextMenu={masterManager.onCellContextMenu}
            onHeaderContextMenu={masterManager.onHeaderContextMenu}
          />
        </div>
      </div>

      {/* ── THANH KÉO CO GIÃN ĐỘ CAO (RESIZABLE SPLITTER) ── */}
      <div
        onMouseDown={handleSplitterMouseDown}
        className="h-2 bg-[#dbe0e6] hover:bg-blue-500 active:bg-blue-600 cursor-row-resize flex items-center justify-center transition-colors border-y border-slate-300 z-10 shrink-0"
        title="Kéo chuột lên/xuống để mở rộng danh sách"
      >
        <div className="w-8 h-1 bg-slate-400 rounded-full flex items-center justify-center opacity-70 hover:opacity-100" />
      </div>

      {/* ── BẢNG 2: DETAIL (DANH SÁCH THAO TÁC TT) ── */}
      <div
        style={{ height: `calc(${100 - topHeightPercent}% - 4px)` }}
        className="flex flex-col min-h-[120px] bg-white overflow-hidden"
      >
        <div className="flex items-center justify-between px-2.5 py-0.5 bg-[#eaedf1] border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <NodeIndexOutlined className="text-purple-600 text-xs" />
            <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wide">
              Chi Tiết Thao Tác TT
            </span>
            {loadingSteps ? (
              <Spin indicator={<LoadingOutlined style={{ fontSize: 12 }} spin />} size="small" />
            ) : (
              <Tag color="purple" className="text-[10px] font-semibold leading-none px-1.5 py-0.5 m-0 rounded-none">
                {currentStepData.length} Thao tác
              </Tag>
            )}
            {selectedMasterRow && (
              <span className="text-[11px] text-purple-700 font-medium">
                (Lệnh: {selectedMasterRow.StageOrderNo})
              </span>
            )}
          </div>
        </div>

        {/* Readonly Info Panel for currently selected Master Row */}
        <WorkProcessDetailHeader selectedRow={selectedMasterRow} className="shrink-0" />

        <div className="flex-1 w-full h-full relative">
          <DataEditor
            ref={stepGridRef}
            columns={stepCols}
            rows={currentStepData.length}
            getCellContent={getStepCellContent}
            gridSelection={stepSelection}
            onGridSelectionChange={setStepSelection}
            smoothScrollX
            smoothScrollY
            getCellsForSelection
            theme={stepManager.gridTheme}
            rowMarkers="both"
            rowMarkerWidth={36}
            rowHeight={26}
            headerHeight={28}
            width="100%"
            height="100%"
            onKeyDown={stepManager.onKeyDown}
            onColumnMoved={stepManager.onColumnMoved}
            onColumnResize={stepManager.onColumnResize}
            onHeaderMenuClick={stepManager.onHeaderMenuClick}
            onCellContextMenu={stepManager.onCellContextMenu}
            onHeaderContextMenu={stepManager.onHeaderContextMenu}
          />
        </div>
      </div>

      {/* Menus & Drawers */}
      {masterManager.showMenu !== null &&
        masterManager.renderLayer(
          <div
            {...masterManager.layerProps}
            className="border w-64 bg-white shadow-lg cursor-pointer"
          >
            <LayoutMenuSheet
              showMenu={masterManager.showMenu}
              handleSort={masterManager.handleSort}
              handleHideColumn={masterManager.handleHideColumn}
              cols={masterCols}
              setShowSearch={setShowSearch}
              setShowMenu={masterManager.setShowMenu}
              handleFreezeColumn={masterManager.handleFreezeColumn}
              showDrawer={masterManager.showDrawer}
            />
          </div>
        )}

      {stepManager.showMenu !== null &&
        stepManager.renderLayer(
          <div
            {...stepManager.layerProps}
            className="border w-64 bg-white shadow-lg cursor-pointer"
          >
            <LayoutMenuSheet
              showMenu={stepManager.showMenu}
              handleSort={stepManager.handleSort}
              handleHideColumn={stepManager.handleHideColumn}
              cols={stepCols}
              setShowSearch={setShowSearch}
              setShowMenu={stepManager.setShowMenu}
              handleFreezeColumn={stepManager.handleFreezeColumn}
              showDrawer={stepManager.showDrawer}
            />
          </div>
        )}

      {/* Drawer Cài đặt ẩn / hiện cột cho Bảng Master */}
      <Drawer
        title={<span className="text-xs flex items-center justify-end font-bold">CÀI ĐẶT CỘT LỆNH CÔNG ĐOẠN</span>}
        styles={{ body: { padding: 15 } }}
        onClose={() => masterManager.setOpenDrawer(false)}
        open={masterManager.openDrawer}
      >
        {(masterManager.configurableCols || []).map((col) => (
          <div key={col.id} style={{ marginBottom: '10px' }}>
            <Checkbox
              checked={!masterManager.hiddenColumns.includes(col.id)}
              onChange={(e) => masterManager.handleCheckboxChange(col.id, e.target.checked)}
            >
              {col.title || col.id}
            </Checkbox>
          </div>
        ))}
      </Drawer>

      {/* Drawer Cài đặt ẩn / hiện cột cho Bảng Detail Steps */}
      <Drawer
        title={<span className="text-xs flex items-center justify-end font-bold">CÀI ĐẶT CỘT THAO TÁC TT</span>}
        styles={{ body: { padding: 15 } }}
        onClose={() => stepManager.setOpenDrawer(false)}
        open={stepManager.openDrawer}
      >
        {(stepManager.configurableCols || []).map((col) => (
          <div key={col.id} style={{ marginBottom: '10px' }}>
            <Checkbox
              checked={!stepManager.hiddenColumns.includes(col.id)}
              onChange={(e) => stepManager.handleCheckboxChange(col.id, e.target.checked)}
            >
              {col.title || col.id}
            </Checkbox>
          </div>
        ))}
      </Drawer>
    </div>
  )
}
