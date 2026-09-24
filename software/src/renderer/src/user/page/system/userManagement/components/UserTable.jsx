import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { Table2 } from 'lucide-react'
import LayoutMenuSheet from '../../../../components/sheet/jsx/layoutMenu'
import LayoutStatusMenuSheet from '../../../../components/sheet/jsx/layoutStatusMenu'
import LayoutContextMenuSheet from '../../../../components/sheet/jsx/layoutContextMenu'
import { Drawer, Checkbox } from 'antd'
import { reorderColumns } from '../../../../components/sheet/js/reorderColumns'
import useOnFill from '../../../../components/hooks/sheet/onFillHook'
import useTableManager from '../../../../components/hooks/sheet/useTableManager'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'
import { CellsPosition } from '../../../../components/sheet/cells/help/cellsPosition'
import GenericCodeHelpModal from '../../../../components/query/core/GenericCodeHelpModal'
import { useDateFormat } from '../../../../hooks/useDateFormat'

const EMPTY_ARRAY = []
const BOOLEAN_KEYS = new Set(['StatusAcc', 'CheckPass1', 'Active', 'IsDataLock'])
const DATE_KEYS = new Set(['CreatedAt', 'UpdatedAt', 'LastLoginDate', 'CreatedDate', 'UpdatedDate'])
const CUSTOM_RENDERERS = [CellsPosition]
const CODE_HELP_COLUMNS = ['EmpCode', 'EmpName', 'DeptName', 'ManagerName', 'PositionName']

export default function UserTable({
  tableTitle,
  setSelection,
  selection,
  setShowSearch,
  showSearch,
  setGridData,
  gridData,
  numRows,
  handleRowAppend,
  setCols,
  cols,
  canEdit,
  defaultCols,
  dataHelp01,
  onVisibleRegionChanged,
  onAddQueryField
}) {
  const { t } = useTranslation()
  const { formatDateTime } = useDateFormat()
  const gridRef = useRef(null)

  const onFill = useOnFill(setGridData, cols)
  const onSearchClose = useCallback(() => setShowSearch(false), [setShowSearch])

  const { freezeColumnsCount, handleFreezeColumn } = useTableConfig('users_manage')

  const codeHelpConfig = useMemo(() => {
    const helpList = Array.isArray(dataHelp01) ? dataHelp01 : []
    const deptMap = new Map()
    helpList.forEach((d) => {
      if (d?.DeptName && !deptMap.has(d.DeptName)) {
        deptMap.set(d.DeptName, { DeptName: d.DeptName, DeptCode: d.DeptCode || '' })
      }
    })
    const deptList = Array.from(deptMap.values())

    const userList = helpList.map((u) => ({
      UserId: u?.UserId || '',
      UserName: u?.UserName || '',
      DeptName: u?.DeptName || '',
      EmpCode: u?.EmpCode || ''
    }))

    return {
      EmpCode: {
        title: t('Tra cứu nhân viên'),
        helpData: userList,
        columns: [
          { id: 'EmpCode', title: t('Mã NV'), width: 140 },
          { id: 'EmpName', title: t('Tên nhân viên'), width: 220 },
          { id: 'DeptName', title: t('Bộ phận'), width: 200 }
        ],
        onSelect: (selected, row, prev) => ({
          EmpCode: selected.EmpCode || selected.UserId || '',
          EmpName: selected.EmpName || selected.UserName || '',
          DeptName: selected.DeptName || prev[row]?.DeptName || ''
        })
      },
      EmpName: {
        title: t('Tra cứu nhân viên'),
        helpData: userList,
        columns: [
          { id: 'EmpCode', title: t('Mã NV'), width: 140 },
          { id: 'EmpName', title: t('Tên nhân viên'), width: 220 },
          { id: 'DeptName', title: t('Bộ phận'), width: 200 }
        ],
        onSelect: (selected, row, prev) => ({
          EmpCode: selected.EmpCode || selected.UserId || '',
          EmpName: selected.EmpName || selected.UserName || '',
          DeptName: selected.DeptName || prev[row]?.DeptName || ''
        })
      },
      DeptName: {
        title: t('Tra cứu bộ phận làm việc'),
        helpData: deptList,
        columns: [
          { id: 'DeptName', title: t('Tên bộ phận'), width: 300 },
          { id: 'DeptCode', title: t('Mã bộ phận'), width: 150 }
        ],
        onSelect: (selected) => ({
          DeptName: selected.DeptName || selected.Name || ''
        })
      },
      ManagerName: {
        title: t('Tra cứu quản lý'),
        helpData: userList,
        columns: [
          { id: 'UserName', title: t('Tên quản lý'), width: 240 },
          { id: 'UserId', title: t('Tài khoản'), width: 180 },
          { id: 'DeptName', title: t('Bộ phận'), width: 200 }
        ],
        onSelect: (selected) => ({
          ManagerName: selected.UserName || selected.Name || selected.UserId || ''
        })
      },
      PositionName: {
        title: t('Tra cứu chức vụ'),
        helpData: dataHelp01 || [],
        columns: [
          { id: 'PositionName', title: t('Chức vụ'), width: 240 },
          { id: 'IdSeq', title: t('Mã chức vụ'), width: 150 },
          { id: 'Description', title: t('Ghi chú'), width: 250 }
        ],
        onSelect: (selected) => ({
          PositionName: selected.PositionName || selected.Name || '',
          PositionSeq: selected.IdSeq || selected.PositionSeq || ''
        })
      }
    }
  }, [gridData, dataHelp01, t])

  const {
    hoverRow,
    onItemHovered,
    showMenu,
    setShowMenu,
    onHeaderMenuClick,
    layerProps,
    renderLayer,
    hiddenColumns,
    handleHideColumn,
    handleReset,
    onColumnMoved,
    onColumnResize,
    handleSort,
    openDrawer: open,
    setOpenDrawer: setOpen,
    showDrawer,
    handleCheckboxChange,
    configurableCols,
    keybindings,
    getCellTheme,
    isCodeHelpColumn,
    isReadOnlyColumn,
    gridTheme,
    onCellClicked,
    onCellActivated,
    onKeyDown,
    codeHelpModal,
    closeCodeHelpModal,
    handleSelectCodeHelp
  } = useTableManager({
    tableId: 'users_manage',
    defaultCols,
    cols,
    setCols,
    setGridData,
    gridData,
    selection,
    setSelection,
    canEdit,
    setShowSearch,
    codeHelpColumns: CODE_HELP_COLUMNS,
    codeHelpConfig,
    onAddQueryField
  })

  const onClose = () => setOpen(false)

  const getData = useCallback(
    ([col, row]) => {
      const person = gridData[row]
      if (!person) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const column = cols[col]
      if (!column) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          readonly: true,
          allowOverlay: false
        }
      }

      const columnKey = column.id || ''
      const value = person[columnKey] ?? ''
      const cellTheme = getCellTheme(columnKey, column)
      const isCodeHelp = isCodeHelpColumn(columnKey)
      const isReadOnly = isReadOnlyColumn(columnKey, column)

      if (columnKey === 'WorkingTag' || columnKey === 'Status') {
        const strVal = String(value)
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: column.hasMenu || false,
          contentAlign: 'center',
          themeOverride: cellTheme
        }
      }

      if (isCodeHelp) {
        const strVal = String(value)
        return {
          kind: GridCellKind.Text,
          data: strVal,
          displayData: strVal,
          readonly: true,
          allowOverlay: false,
          hasMenu: column.hasMenu || false,
          themeOverride: cellTheme
        }
      }

      if (column.kind === 'Boolean' || BOOLEAN_KEYS.has(columnKey)) {
        const booleanValue =
          value === 1 || value === '1' || value === true || value === 'true'
            ? true
            : value === 0 || value === '0' || value === false || value === 'false'
              ? false
              : Boolean(value)
        return {
          kind: GridCellKind.Boolean,
          data: booleanValue,
          readonly: isReadOnly || column.readonly || false,
          allowOverlay: true,
          hasMenu: column.hasMenu || false,
          themeOverride: cellTheme
        }
      }

      const isDateCol =
        DATE_KEYS.has(columnKey) || columnKey.endsWith('Date') || columnKey.endsWith('At')
      const strValue = String(value)
      const displayData = isDateCol && value ? formatDateTime(value) || strValue : strValue

      return {
        kind: GridCellKind.Text,
        data: strValue,
        displayData: displayData,
        readonly: isReadOnly || column.readonly || false,
        allowOverlay: !isReadOnly,
        hasMenu: column.hasMenu || false,
        themeOverride: cellTheme
      }
    },
    [gridData, cols, getCellTheme, isCodeHelpColumn, isReadOnlyColumn, formatDateTime]
  )

  const onKeyUp = useCallback((event) => {}, [cols, gridData])

  const onCellEdited = useCallback(
    async (cell, newValue) => {
      if (
        newValue.kind !== GridCellKind.Text &&
        newValue.kind !== GridCellKind.Custom &&
        newValue.kind !== GridCellKind.Boolean &&
        newValue.kind !== GridCellKind.Number
      ) {
        return
      }
      if (canEdit === false) {
        return
      }
      const indexes = reorderColumns(cols)
      const [col, row] = cell
      const key = indexes[col]

      // Chặn edit trực tiếp bằng bàn phím trên các cột CodeHelp & Readonly
      if (
        isCodeHelpColumn(key) ||
        isReadOnlyColumn(key) ||
        CODE_HELP_COLUMNS.includes(key) ||
        key === 'WorkingTag' ||
        key === 'Status' ||
        key === 'StatusAcc' ||
        key === 'CheckPass1' ||
        key === 'Active' ||
        key === 'PositionSeq' ||
        key === 'PartSeq' ||
        key === 'ProdDepartSeq'
      ) {
        return
      }

      if (key === 'PositionName' && newValue.kind === GridCellKind.Custom) {
        setGridData((prevData) => {
          const updatedData = [...prevData]
          if (!updatedData[row]) updatedData[row] = {}
          const item = updatedData[row]
          const selected = Array.isArray(newValue.data) ? newValue.data[0] : newValue.data
          if (selected) {
            item['PositionName'] = selected.PositionName || ''
            item['PositionSeq'] = selected.IdSeq || ''
          } else {
            item['PositionName'] = ''
            item['PositionSeq'] = ''
          }
          const currentStatus = item['WorkingTag'] || item['Status'] || ''
          const nextStatus = currentStatus === 'A' ? 'A' : 'U'
          item['WorkingTag'] = nextStatus
          item['Status'] = nextStatus
          return updatedData
        })
        return
      }

      setGridData((prevData) => {
        const updatedData = [...prevData]
        if (!updatedData[row]) updatedData[row] = {}

        const currentStatus =
          updatedData[row]['WorkingTag'] || updatedData[row]['Status'] || ''
        const nextStatus = currentStatus === 'A' ? 'A' : 'U'
        updatedData[row][key] = newValue.data
        updatedData[row]['WorkingTag'] = nextStatus
        updatedData[row]['Status'] = nextStatus

        return updatedData
      })
    },
    [cols, canEdit, setGridData]
  )

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <h2 className="text-[10px] italic text-indigo-600 border-b border-slate-200 font-bold flex items-center gap-1.5 px-2 py-1 uppercase bg-white">
          <span className="w-1 h-3 bg-indigo-600 rounded-full inline-block shrink-0" />
          <span>{tableTitle || t('Data')}</span>
        </h2>
        <DataEditor
          ref={gridRef}
          theme={gridTheme}
          columns={cols}
          getCellContent={getData}
          onFill={onFill}
          rows={numRows}
          showSearch={showSearch}
          onSearchClose={onSearchClose}
          rowMarkers="both"
          width="100%"
          height="100%"
          rowSelect="multi"
          columnSelect="single"
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          getCellsForSelection={true}
          trailingRowOptions={{
            hint: ' ',
            sticky: true,
            tint: true
          }}
          freezeColumns={freezeColumnsCount}
          headerHeight={23}
          getRowThemeOverride={(rowIndex) => {
            if (rowIndex === hoverRow) {
              return {
                bgCell: '#f7f7f7',
                bgCellMedium: '#f0f0f0'
              }
            }
            return undefined
          }}
          onItemHovered={onItemHovered}
          overscrollY={0}
          overscrollX={0}
          smoothScrollY={false}
          smoothScrollX={false}
          freezeTrailingRows={0}
          rowHeight={23}
          onPaste={true}
          fillHandle={true}
          keybindings={keybindings}
          isDraggable={false}
          onRowAppended={() => handleRowAppend(1)}
          onCellEdited={onCellEdited}
          highlightRegions={EMPTY_ARRAY}
          onColumnResize={onColumnResize}
          onHeaderMenuClick={onHeaderMenuClick}
          onColumnMoved={onColumnMoved}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onVisibleRegionChanged={onVisibleRegionChanged}
          customRenderers={CUSTOM_RENDERERS}
          onCellClicked={onCellClicked}
          onCellActivated={onCellActivated}
        />
        {/* Modal CodeHelp View Sheet */}
        {codeHelpModal?.isOpen && (
          <GenericCodeHelpModal
            isOpen={codeHelpModal.isOpen}
            onClose={closeCodeHelpModal}
            title={codeHelpModal.title}
            helpData={codeHelpModal.helpData}
            columns={codeHelpModal.columns}
            initialSearchText={codeHelpModal.initialSearchText}
            onSelect={handleSelectCodeHelp}
          />
        )}
        {showMenu !== null &&
          renderLayer(
            <div
              {...layerProps}
              className="border w-72 rounded-lg bg-white shadow-lg cursor-pointer"
            >
              {showMenu.menuType === 'statusMenu' ? (
                <LayoutStatusMenuSheet
                  showMenu={showMenu}
                  handleSort={handleSort}
                  cols={cols}
                  renderLayer={renderLayer}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  layerProps={layerProps}
                  handleReset={handleReset}
                  showDrawer={showDrawer}
                  data={gridData}
                  handleRowAppend={handleRowAppend}
                />
              ) : showMenu.menuType === 'contextMenu' ? (
                <LayoutContextMenuSheet
                  showMenu={showMenu}
                  cols={cols}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  data={gridData}
                  handleRowAppend={handleRowAppend}
                  selection={selection}
                  canCreate={canEdit}
                />
              ) : (
                <LayoutMenuSheet
                  showMenu={showMenu}
                  handleSort={handleSort}
                  handleHideColumn={handleHideColumn}
                  cols={cols}
                  renderLayer={renderLayer}
                  setShowSearch={setShowSearch}
                  setShowMenu={setShowMenu}
                  layerProps={layerProps}
                  handleFreezeColumn={handleFreezeColumn}
                />
              )}
            </div>
          )}
        <Drawer
          title={<span className="text-xs flex items-center justify-end font-bold">CÀI ĐẶT SHEET</span>}
          styles={{ body: { padding: 15 } }}
          onClose={onClose}
          open={open}
        >
          {(configurableCols || []).map((col) => (
            <div key={col.id} style={{ marginBottom: '10px' }}>
              <Checkbox
                checked={!hiddenColumns.includes(col.id)}
                onChange={(e) => handleCheckboxChange(col.id, e.target.checked)}
              >
                {col.title || col.id}
              </Checkbox>
            </div>
          ))}
        </Drawer>
      </div>
    </div>
  )
}
