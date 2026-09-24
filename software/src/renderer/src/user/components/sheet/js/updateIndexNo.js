export const updateIndexNo = (data) => {
  if (!Array.isArray(data)) return []
  return data.map((row, index) => {
    return {
      ...row,
      IdxNo: index + 1
    }
  })
}
