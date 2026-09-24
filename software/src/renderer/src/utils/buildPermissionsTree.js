export function buildPermissionsTree(roleTables) {
  const groups = {}

  roleTables.forEach((r) => {
    if (r.TblGrpSeq && r.GroupKeyCode) {
      if (!groups[r.GroupKeyCode]) {
        groups[r.GroupKeyCode] = {
          groupSeq: r.TblGrpSeq,
          groupKey: r.GroupKeyCode,
          items: []
        }
      }

      if (r.TblGrpItemSeq && r.ItemKeyCode) {
        groups[r.GroupKeyCode].items.push({
          itemSeq: r.TblGrpItemSeq,
          itemKey: r.ItemKeyCode,
          view: r.View,
          edit: r.Edit
        })
      }
    }
  })

  return Object.values(groups).filter((g) => g.items.length > 0)
}
