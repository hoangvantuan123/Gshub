/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataEditor, GridCellKind, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import useTableConfig from '../../../../components/hooks/sheet/useTableConfig'

export default function RoleGroupListTable({
  groups = [],
  selectedGroupId,
  onSelectGroup,
  canEdit = true
}) {
  const { t } = useTranslation()
  const gridRef = useRef(null)

  const { rowHeight, headerHeight } = useTableConfig('role_group_list')

  const cols = useMemo(
    () => [
      {
        title: t('ID'),
        id: 'Id',
        width: 50,
        readonly: true
      },
      {
        title: t('Tên Nhóm Quyền'),
        id: 'Name',
        width: 190,
        readonly: true
      },
      {
        title: t('Ghi Chú'),
        id: 'Comment',
        width: 140,
        readonly: true
      }
    ],
    [t]
  )

  const selectedRowIndex = useMemo(() => {
    const idx = groups.findIndex((g) => String(g.Id) === String(selectedGroupId))
    return idx >= 0 ? idx : 0
  }, [groups, selectedGroupId])

  const selection = useMemo(() => {
    if (selectedRowIndex < 0 || groups.length === 0) {
      return {
        columns: CompactSelection.empty(),
        rows: CompactSelection.empty()
      }
    }
    return {
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty().add(selectedRowIndex),
      current: {
        cell: [1, selectedRowIndex],
        range: { x: 0, y: selectedRowIndex, width: cols.length, height: 1 },
        rangeStack: []
      }
    }
  }, [selectedRowIndex, groups.length, cols.length])

  const getCellContent = useCallback(
    ([col, row]) => {
      const rowData = groups[row] || {}
      const colObj = cols[col]
      const key = colObj?.id || ''
      const val = rowData[key] !== undefined && rowData[key] !== null ? String(rowData[key]) : ''

      const isSelected = String(rowData.Id) === String(selectedGroupId)

      return {
        kind: GridCellKind.Text,
        data: val,
        displayData: val,
        allowOverlay: false,
        readonly: true,
        themeOverride: isSelected
          ? {
              bgCell: '#eff6ff',
              textDark: '#1d4ed8',
              baseFontStyle: 'bold 12px'
            }
          : undefined
      }
    },
    [cols, groups, selectedGroupId]
  )

  const onCellClicked = useCallback(
    ([col, row]) => {
      if (row >= 0 && groups[row]) {
        const g = groups[row]
        if (onSelectGroup) {
          onSelectGroup(g)
        }
      }
    },
    [groups, onSelectGroup]
  )

  return (
    <div className="h-full w-full bg-white relative overflow-hidden">
      <DataEditor
        ref={gridRef}
        width="100%"
        height="100%"
        rows={groups.length}
        columns={cols}
        getCellContent={getCellContent}
        getCellsForSelection={true}
        onCellClicked={onCellClicked}
        gridSelection={selection}
        rowMarkers="both"
        rowHeight={rowHeight || 24}
        headerHeight={headerHeight || 24}
        smoothScrollX={true}
        smoothScrollY={true}
      />
    </div>
  )
}
