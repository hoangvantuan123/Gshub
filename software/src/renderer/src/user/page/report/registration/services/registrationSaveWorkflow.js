function requireSuccess(response) {
  if (response?.success !== true) {
    const error = new Error(
      response?.message || 'Lưu báo cáo thất bại: máy chủ chưa xác nhận kết quả.'
    )
    error.code = response?.code
    error.statusCode = response?.statusCode
    error.isCanceled = response?.isCanceled === true
    throw error
  }
  return response
}

export async function saveRegistrationBatches({
  request,
  payload,
  rows,
  isStat,
  signal,
  onProgress,
  chunkSize = 1000
}) {
  const total = rows.length
  const assertNotCanceled = () => {
    if (signal?.aborted) throw new Error('Thao tác lưu đã bị hủy bởi người dùng')
  }
  assertNotCanceled()
  onProgress?.({ current: 0, total, percent: 0 })

  const firstChunk = rows.slice(0, chunkSize)
  const masterResponse = requireSuccess(
    await request({
      url: '/report/plan/PlanRegistrationA',
      method: 'POST',
      data: {
        ...payload,
        totalRows: total,
        planData: isStat ? [] : firstChunk,
        statsData: isStat ? firstChunk : [],
        sheetData: firstChunk,
        data: firstChunk
      },
      timeout: 180000,
      signal
    })
  )

  const master = masterResponse.data
  if (!master?.IdSeq || !master?.RegCode) {
    throw new Error(
      'Máy chủ chưa trả về mã đăng ký và ID bản ghi đã lưu. Không thể xác nhận hoàn tất.'
    )
  }
  let savedRows = firstChunk.length
  const reportProgress = () =>
    onProgress?.({
      current: savedRows,
      total,
      percent: savedRows === total ? 100 : Math.min(99, Math.round((savedRows / total) * 100))
    })
  reportProgress()

  try {
    for (let start = chunkSize; start < total; start += chunkSize) {
      assertNotCanceled()
      const chunk = rows.slice(start, start + chunkSize).map((item, index) => ({
        ...item,
        MasterSeq: master.IdSeq,
        RegCode: master.RegCode,
        RowSeq: start + index + 1
      }))
      requireSuccess(
        await request({
          url: isStat ? '/report/plan/ProdStatsDetailA' : '/report/plan/PlanDetailA',
          method: 'POST',
          data: chunk,
          timeout: 180000,
          signal
        })
      )
      savedRows += chunk.length
      reportProgress()
    }
  } catch (error) {
    error.savedRows = savedRows
    error.regCode = master.RegCode
    error.message += ` Đã lưu ${savedRows}/${total} dòng của đợt ${master.RegCode}; đồng bộ chưa hoàn tất.`
    throw error
  }
  return masterResponse
}
