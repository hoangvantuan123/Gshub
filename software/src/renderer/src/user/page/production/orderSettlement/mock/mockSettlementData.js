export const MOCK_SETTLEMENT_FLAT_DATA = []

/**
 * Gom nhóm động dữ liệu theo bất kỳ cột nào (mặc định StageOrderNo)
 */
export function buildDynamicGroupedTree(flatData = [], groupByKey = 'StageOrderNo') {
  if (!Array.isArray(flatData)) return []

  const groupMap = new Map()

  flatData.forEach((row) => {
    const rawVal = row[groupByKey]
    const groupVal =
      rawVal !== undefined && rawVal !== null && rawVal !== '' ? String(rawVal) : '(Trống)'
    const groupKey = `GRP_${groupByKey}_${groupVal}`

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: groupKey,
        IsGroup: true,
        Level: 0,
        GroupKey: groupKey,
        GroupColumn: groupByKey,
        GroupValue: groupVal,
        WorkingTag: '',
        children: []
      })
    }

    groupMap.get(groupKey).children.push(row)
  })

  return Array.from(groupMap.values()).map((grp) => {
    const firstChild = grp.children[0] || {}
    const count = grp.children.length
    const isAllSettled = grp.children.length > 0 && grp.children.every((c) => Boolean(c.IsSettled))

    const sumPlannedAchieved = grp.children.reduce(
      (acc, c) => acc + (Number(c.PlannedAchievedQty) || 0),
      0
    )
    const sumPlannedProd = grp.children.reduce(
      (acc, c) => acc + (Number(c.PlannedProductionQty) || 0),
      0
    )
    const sumStatAchieved = grp.children.reduce(
      (acc, c) => acc + (Number(c.StatAchievedQty) || 0),
      0
    )
    const sumStatProd = grp.children.reduce((acc, c) => acc + (Number(c.StatProductionQty) || 0), 0)
    const sumReceipt = grp.children.reduce(
      (acc, c) => acc + (Number(c.WarehouseReceiptQty) || 0),
      0
    )

    const hasOpDetail = grp.children.some(
      (c) => Boolean(c.OperationCode) || (Boolean(c.DetailNo) && c.DetailNo !== c.StageOrderNo)
    )

    return {
      ...grp,
      Level: 0,
      [groupByKey]: grp.GroupValue,
      OrderType: 'Lệnh CĐ',
      StageOrderNo: groupByKey === 'StageOrderNo' ? grp.GroupValue : firstChild.StageOrderNo,
      ItemCode: groupByKey === 'ItemCode' ? grp.GroupValue : firstChild.ItemCode,
      ItemName: groupByKey === 'ItemName' ? grp.GroupValue : firstChild.ItemName,
      Unit: firstChild.Unit || '',
      Status: isAllSettled ? 'Đã quyết toán' : 'Chờ quyết toán',
      OperationCode: groupByKey === 'OperationCode' ? grp.GroupValue : '',
      OperationName: groupByKey === 'OperationName' ? grp.GroupValue : '',
      WorkStepTypeCode: groupByKey === 'WorkStepTypeCode' ? grp.GroupValue : '',
      MachineName: groupByKey === 'MachineName' ? grp.GroupValue : '',
      BuiltinOrder: groupByKey === 'BuiltinOrder' ? grp.GroupValue : '',
      DetailNo: groupByKey === 'DetailNo' ? grp.GroupValue : hasOpDetail ? `${count} thao tác` : '',
      DoRequiredQty: firstChild.DoRequiredQty,
      InitialAdjustQty: firstChild.InitialAdjustQty,
      AdjustedRequiredQty: firstChild.AdjustedRequiredQty,
      WasteCompensationQty: firstChild.WasteCompensationQty,
      ProductionRequiredQty: firstChild.ProductionRequiredQty,
      PlannedAchievedQty:
        sumPlannedAchieved > 0 ? sumPlannedAchieved : firstChild.PlannedAchievedQty,
      PlannedProductionQty: sumPlannedProd > 0 ? sumPlannedProd : firstChild.PlannedProductionQty,
      StatAchievedQty: sumStatAchieved > 0 ? sumStatAchieved : firstChild.StatAchievedQty,
      StatProductionQty: sumStatProd > 0 ? sumStatProd : firstChild.StatProductionQty,
      WarehouseReceiptQty: sumReceipt > 0 ? sumReceipt : firstChild.WarehouseReceiptQty,
      IsSettled: isAllSettled,
      SettlementQty: firstChild.SettlementQty,
      GroupCount: count
    }
  })
}

/**
 * Trải phẳng Tree thành danh sách hiển thị Virtual Grid chuẩn phân cấp ERP
 */
export function flattenDynamicTree(
  treeData = [],
  expandedKeys = new Set(),
  groupByKey = 'StageOrderNo'
) {
  const result = []

  treeData.forEach((grp) => {
    const isExpanded = expandedKeys.has(grp.id)
    const prefix = isExpanded ? '[-] ' : '[+] '

    const groupRow = {
      ...grp,
      Level: 0,
      IsExpanded: isExpanded,
      OrderType: 'Lệnh CĐ',
      [groupByKey]: `${prefix}${grp.GroupValue} (${grp.GroupCount})`
    }
    result.push(groupRow)

    if (isExpanded && Array.isArray(grp.children)) {
      grp.children.forEach((child) => {
        const cleanDetailNo =
          child.DetailNo && child.DetailNo !== child.StageOrderNo ? child.DetailNo : ''
        const isOpOrder = Boolean(cleanDetailNo || child.OperationCode || child.WorkStepTypeCode)
        result.push({
          ...child,
          Level: 1,
          IsChild: true,
          ParentGroupId: grp.id,
          // Phân biệt: có số chi tiết là Lệnh thao tác (Lệnh TT), không có là Lệnh công đoạn (Lệnh CĐ)
          OrderType: isOpOrder ? 'Lệnh TT' : 'Lệnh CĐ',
          // Dòng chi tiết: để trống cột mã lệnh master, dồn thông tin vào các cột chi tiết bên trong
          StageOrderNo: '',
          DetailNo: cleanDetailNo,
          BuiltinOrder: child.BuiltinOrder ?? '',
          WorkStepTypeCode: child.WorkStepTypeCode || '',
          OperationCode: child.OperationCode || '',
          OperationName: child.OperationName || '',
          MachineName: child.MachineName || '',
          Unit: child.Unit || ''
        })
      })
    }
  })

  return result
}

export function getAllGroupKeys(treeData = []) {
  return treeData.map((grp) => grp.id)
}
