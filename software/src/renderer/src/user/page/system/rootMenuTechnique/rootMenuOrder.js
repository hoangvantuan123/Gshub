// API IdxNo is catalogue order; grid IdxNo is row identity.
export const fromRootMenuApi = (item) => ({ ...item, OrderSeq: item.IdxNo })
export const toRootMenuOrder = (item) => Number(item.OrderSeq ?? item.IdxNo ?? 0)
