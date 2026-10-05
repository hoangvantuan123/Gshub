/* eslint-disable react/prop-types */
export function PlanTeamBottleneckSection({ advancedPlanMetrics = {}, teamBreakdown = [] }) {
  return (
    <div style={{ marginBottom: 44, width: '100%', background: '#ffffff', padding: '8px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span>6. ĐÁNH GIÁ CHUYÊN SÂU TIẾN ĐỘ &amp; CÂN BẰNG TẢI CÔNG ĐOẠN</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
            Đo lường mức độ tuân thủ tiến độ (Schedule Adherence), độ lệch ngày bình quân và tình
            trạng cân bằng tải giữa các tổ sản xuất
          </div>
        </div>
      </div>

      {/* 4 Thẻ Chỉ Số Chuyên Sâu */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 20
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #059669'
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase'
            }}
          >
            Đáp ứng sản lượng (QFR)
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {advancedPlanMetrics.qtyFulfillmentRate || 0}%
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            {(advancedPlanMetrics.totalActualQty || 0).toLocaleString('vi-VN')} /{' '}
            {(advancedPlanMetrics.totalPlanQty || 0).toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #0284c7'
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase'
            }}
          >
            Tuân thủ định mức TG
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {advancedPlanMetrics.timeComplianceRate || 0}%
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>Đúng/Nhanh hơn định mức thời gian</div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #ea580c'
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase'
            }}
          >
            Độ lệch ngày bình quân
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#ea580c', margin: '4px 0' }}>
            {Number(advancedPlanMetrics.avgDriftDays || 0) > 0
              ? `+${advancedPlanMetrics.avgDriftDays}`
              : advancedPlanMetrics.avgDriftDays || 0}{' '}
            <span style={{ fontSize: 14, fontWeight: 600 }}>ngày</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#9a3412' }}>Chênh lệch OpDate vs RoutingDate</div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #7c3aed'
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase'
            }}
          >
            Cân bằng tải Capa
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
            {advancedPlanMetrics.capaComplianceRate || 0}%
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            Tỷ lệ lệnh đúng hoặc nằm trong capa máy
          </div>
        </div>
      </div>

      {/* Bảng Đánh Giá Điểm Nghẽn Theo Tổ Sản Xuất */}
      <div style={{ width: '100%', marginBottom: 12, overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderTop: '2px solid #0f172a',
            borderBottom: '2px solid #0f172a',
            fontSize: 12,
            textAlign: 'left',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #0f172a', background: '#f8fafc' }}>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Tổ / Nhóm công đoạn
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: 12,
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Số lệnh giao
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: 12,
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Tỷ lệ lệch ngày
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: 12,
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Tỷ lệ trượt KH
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: 12,
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Tỷ lệ đạt chuẩn
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: 12,
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                Trạng thái tải
              </th>
            </tr>
          </thead>
          <tbody>
            {teamBreakdown.map((row, idx) => {
              const isOverload = row.sxSaiNgayRate > 50 || row.truotKhRate > 40
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 1 ? '#fafafa' : 'transparent'
                  }}
                >
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.teamName || 'Tổ sản xuất'}
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {Number(row.totalOrders || 0).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                    <span style={{ fontWeight: 600 }}>
                      {Number(row.sxSaiNgay || 0).toLocaleString('vi-VN')}
                    </span>{' '}
                    <span style={{ color: '#64748b', fontSize: 12 }}>({row.sxSaiNgayRate}%)</span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>
                    <span style={{ fontWeight: 600 }}>
                      {Number(row.truotKh || 0).toLocaleString('vi-VN')}
                    </span>{' '}
                    <span style={{ color: '#64748b', fontSize: 12 }}>({row.truotKhRate}%)</span>
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {row.passRate}%
                  </td>
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: isOverload ? '#c2410c' : '#047857'
                    }}
                  >
                    {isOverload ? 'Cần cân bằng' : 'Ổn định'}
                  </td>
                </tr>
              )
            })}

            {/* DÒNG TỔNG CỘNG TỔ CÔNG ĐOẠN */}
            {teamBreakdown.length > 0 && (
              <tr
                style={{
                  borderTop: '1.5px solid #0f172a',
                  background: '#f1f5f9'
                }}
              >
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                  TỔNG CỘNG ({teamBreakdown.length} TỔ)
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  {teamBreakdown
                    .reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                    .toLocaleString('vi-VN')}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {(() => {
                    const total = teamBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                    const count = teamBreakdown.reduce((sum, r) => sum + (r.sxSaiNgay || 0), 0)
                    const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                    return (
                      <>
                        <span>{count.toLocaleString('vi-VN')}</span>{' '}
                        <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                      </>
                    )
                  })()}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {(() => {
                    const total = teamBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                    const count = teamBreakdown.reduce((sum, r) => sum + (r.truotKh || 0), 0)
                    const rate = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
                    return (
                      <>
                        <span>{count.toLocaleString('vi-VN')}</span>{' '}
                        <span style={{ color: '#64748b', fontSize: 11 }}>({rate}%)</span>
                      </>
                    )
                  })()}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  {(() => {
                    const total = teamBreakdown.reduce((sum, r) => sum + (r.totalOrders || 0), 0)
                    const passCount = teamBreakdown.reduce(
                      (sum, r) => sum + (r.khopSl || 0) + (r.khopJob || 0),
                      0
                    )
                    return total > 0 ? `${((passCount / total) * 100).toFixed(1)}%` : '0.0%'
                  })()}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                  <span style={{ color: '#047857' }}>Ổn định</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PlanTeamBottleneckSection
