/* eslint-disable react/prop-types */
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { Drawer, Checkbox } from 'antd'

import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import { useDateFormat } from '../../../../hooks/useDateFormat'

const NUMBER_KEYS = new Set([
  'BuiltinOrder',
  'StepCount',
  'QuantitySO',
  'QuantityCDIssue',
  'QuantityProduce',
  'QuantityPass',
  'QuantityAdj',
  'QuantityAfterAdj_Pass',
  'QuantityAfterAdj',
  'QuantityOff',
  'QuantityReceipt',
  'QuantityTransfered',
  'QuantityProductTransfered',
  'DocStatus',
  'Stt',
  'Id'
])

const PERCENT_KEYS = new Set(['RateReceipt', 'RatePass', 'RateProduce'])

const BOOLEAN_KEYS = new Set([
  'IsComplete',
  'Closed',
  'IsStop',
  'AllowAdj',
  'IsCheckSample',
  'PostSL'
])

const DATE_KEYS = new Set([
  'DocDate',
  'CreatedDate',
  'CreatedAt',
  'ModifiedDate',
  'EditDate',
  'ModifiedAt',
  'CreateDate',
  'DeliveryDateDO',
  'ClosedDate'
])

export default function WorkProcessTable({
  masterList = [],
  setMasterList,
  masterCols = [],
  setMasterCols,
  defaultMasterCols = [],
  masterSelection,
  setMasterSelection,
  onVisibleRegionChanged,
  showSearch,
  setShowSearch,
  canEdit = false,
  canCreate = false,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()

  const masterGridRef = useRef(null)

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
          const cVal = row.CreatedBy_Name ?? row.CreatedByName ?? row.CreateBy_Name ?? ''
          if (cVal) {
            rawVal = cVal
          } else {
            const rawCre = row.CreatedBy ?? row.CreateBy ?? row.Creator ?? ''
            if (rawCre === -1 || rawCre === '-1') rawVal = 'Hệ thống'
            else if (rawCre && isNaN(Number(rawCre))) rawVal = rawCre
            else rawVal = ''
          }
        } else if (col.id === 'ModifiedBy_Name') {
          const mVal = row.ModifiedBy_Name ?? row.ModifiedByName ?? row.EditBy_Name ?? ''
          if (mVal) {
            rawVal = mVal
          } else {
            const rawMod = row.ModifiedBy ?? row.EditBy ?? row.Editor ?? ''
            if (rawMod === -1 || rawMod === '-1') rawVal = 'Hệ thống'
            else if (rawMod && isNaN(Number(rawMod))) rawVal = rawMod
            else rawVal = ''
          }
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
          contentAlign: 'center',
          themeOverride: { textDark: '#225588', baseFontStyle: 'bold 12px Inter, sans-serif' }
        }
      }

      // Trạng thái duyệt
      if (col.id === 'ApprovalStatus') {
        const valNum = rawVal != null && rawVal !== '' ? Number(rawVal) : null
        let text = '-'
        let color = '#94a3b8'
        if (valNum === 0) {
          text = '0 - Lập phiếu'
          color = '#64748b'
        } else if (valNum === 1) {
          text = '1 - Chờ duyệt'
          color = '#d97706'
        } else if (valNum === 2) {
          text = '2 - Đã duyệt chờ hoàn thiện'
          color = '#2563eb'
        } else if (valNum === 3) {
          text = '3 - Đã duyệt chờ hoàn thiện'
          color = '#0284c7'
        } else if (valNum === 4 || row.IsComplete || row.Closed) {
          text = '4 - Hoàn thiện'
          color = '#15803d'
        } else if (valNum != null && !isNaN(valNum)) {
          text = `${valNum}`
          color = '#475569'
        }
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text,
          allowOverlay: false,
          readonly: true,
          contentAlign: 'center',
          themeOverride: { textDark: color, baseFontStyle: '600 12px Inter, sans-serif' }
        }
      }

      // Boolean Columns (True/False - Checkbox - Căn giữa)
      if (BOOLEAN_KEYS.has(col.id) || col.kind === 'Boolean') {
        const isChecked = rawVal === true || rawVal === 1 || rawVal === '1' || rawVal === 'true'
        return {
          kind: GridCellKind.Boolean,
          data: isChecked,
          allowOverlay: false,
          readonly: true,
          contentAlign: 'center'
        }
      }

      // Date Columns (Căn giữa)
      if (DATE_KEYS.has(col.id) || col.kind === 'Date') {
        const display = formatDisplayDate(rawVal)
        return {
          kind: GridCellKind.Text,
          data: String(rawVal || ''),
          displayData: display,
          allowOverlay: false,
          readonly: true,
          contentAlign: 'center'
        }
      }

      // Percentage Columns (% Hệ thống & Tỷ lệ - Căn phải)
      if (PERCENT_KEYS.has(col.id)) {
        if (rawVal == null || rawVal === '') {
          return {
            kind: GridCellKind.Text,
            data: '',
            displayData: '-',
            allowOverlay: false,
            readonly: true,
            contentAlign: 'right'
          }
        }
        const num = Number(rawVal)
        const display = isNaN(num) ? String(rawVal) : `${num.toFixed(1)}%`
        return {
          kind: GridCellKind.Text,
          data: display,
          displayData: display,
          allowOverlay: false,
          readonly: true,
          contentAlign: 'right',
          themeOverride: {
            textDark:
              num >= 100 ? '#15803d' : num >= 80 ? '#2563eb' : num > 0 ? '#d97706' : '#64748b',
            baseFontStyle: '600 12px Inter, sans-serif'
          }
        }
      }

      // Number Columns (SL, Định mức, Điều chỉnh, Trạng thái - Căn phải 100%)
      if (NUMBER_KEYS.has(col.id) || col.kind === 'Number' || col.contentAlign === 'right') {
        const num = rawVal != null && rawVal !== '' ? Number(rawVal) : null
        const display =
          num != null && !isNaN(num)
            ? num.toLocaleString('vi-VN')
            : col.id === 'StepCount'
              ? '-'
              : ''
        return {
          kind: GridCellKind.Number,
          data: num ?? 0,
          displayData: display,
          allowOverlay: false,
          readonly: true,
          contentAlign: 'right',
          themeOverride:
            col.id === 'QuantityProduce'
              ? { textDark: '#15803d', baseFontStyle: '600 12px Inter, sans-serif' }
              : col.id === 'QuantityPass'
                ? { textDark: '#1d4ed8', baseFontStyle: '600 12px Inter, sans-serif' }
                : col.id === 'QuantityOff'
                  ? { textDark: '#dc2626', baseFontStyle: '600 12px Inter, sans-serif' }
                  : col.id === 'QuantityAdj' && num !== 0
                    ? { textDark: '#7c3aed', baseFontStyle: '600 12px Inter, sans-serif' }
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
        contentAlign: col.contentAlign || (col.id === 'Unit' ? 'center' : undefined),
        themeOverride: col.themeOverride
      }
    },
    [masterCols, masterList, formatDisplayDate]
  )

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white select-none relative">
      <div className="flex-1 w-full h-full relative">
        <DataEditor
          ref={masterGridRef}
          columns={masterCols}
          rows={masterList.length}
          getCellContent={getMasterCellContent}
          gridSelection={masterSelection}
          onGridSelectionChange={setMasterSelection}
          onVisibleRegionChanged={onVisibleRegionChanged}
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

      {/* Drawer Cài đặt ẩn / hiện cột cho Bảng Master */}
      <Drawer
        title={
          <span className="text-xs flex items-center justify-end font-bold">
            {t('CÀI ĐẶT CỘT LỆNH CÔNG ĐOẠN')}
          </span>
        }
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
    </div>
  )
}
