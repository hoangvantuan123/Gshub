/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Search } from 'lucide-react'
import { PureButton } from './reportUIComponents'

export const PLAN_FORMULA_DATABASE = [
  {
    id: 'kpi_total_orders',
    category: 'KPI',
    title: 'Tổng số lệnh thao tác',
    columnId: 'totalOrders',
    columnName: 'Tổng số lệnh',
    scope: 'Thẻ KPI 1 & Toàn bộ báo cáo',
    formula: 'COUNT(IdSeq) trong phạm vi bộ lọc',
    source: 'Bảng _ERPPlanDetail (OperationNo / DocNo)',
    description: 'Tổng số lệnh điều phối sản xuất nằm trong phạm vi ngày và các điều kiện lọc được chọn.'
  },
  {
    id: 'kpi_sx_sai_ngay',
    category: 'KPI',
    title: 'SX sai ngày KH',
    columnId: 'sxSaiNgayCount',
    columnName: 'SX sai ngày KH',
    scope: 'Thẻ KPI 2 & Mục 3 & Mục 5',
    formula: 'COUNT IF (StatusDpSx = "SX sai ngày KH" HOẶC OpDate != RoutingDocDate)',
    source: 'So khớp ngày thực hiện (OpDate) với ngày điều phối (RoutingDocDate)',
    description: 'Số lượng và tỷ lệ lệnh có ngày sản xuất thực tế lệch so với ngày kế hoạch ban đầu.'
  },
  {
    id: 'kpi_truot_kh',
    category: 'KPI',
    title: 'Trượt kế hoạch (Trượt KH)',
    columnId: 'truotKhCount',
    columnName: 'Trượt KH',
    scope: 'Thẻ KPI 3 & Mục 3 & Mục 5',
    formula: 'COUNT IF (StatusDpSx = "Trượt KH" HOẶC StatPassQty < TargetProdQty * 0.9)',
    source: 'Cột StatusDpSx hoặc tỷ lệ sản lượng đạt so với kế hoạch',
    description: 'Các lệnh không hoàn thành đúng tiến độ hoặc bị thiếu hụt sản lượng so với chỉ tiêu kế hoạch.'
  },
  {
    id: 'kpi_khop_sl',
    category: 'KPI',
    title: 'Khớp số lượng',
    columnId: 'khopSlCount',
    columnName: 'Khớp số lượng',
    scope: 'Thẻ KPI 4 & Mục 3 & Mục 5',
    formula: 'COUNT IF (StatusDpSx = "Khớp số lượng")',
    source: 'Cột StatusDpSx từ hệ thống ERP/MES',
    description: 'Các lệnh hoàn thành đúng số lượng yêu cầu theo kế hoạch sản xuất đã giao.'
  },
  {
    id: 'kpi_khop_job',
    category: 'KPI',
    title: 'Khớp job',
    columnId: 'khopJobCount',
    columnName: 'Khớp job',
    scope: 'Thẻ KPI 5 & Mục 3 & Mục 5',
    formula: 'COUNT IF (StatusDpSx = "Khớp job")',
    source: 'Cột StatusDpSx từ hệ thống ERP/MES',
    description: 'Các lệnh hoàn thành chuẩn xác theo từng quy cách mã hàng và chi tiết sản xuất.'
  },
  {
    id: 'chart_time_status',
    category: 'CHARTS',
    title: 'Trạng thái Thời gian (So với Định mức)',
    columnId: 'TimeStatus',
    columnName: 'Thời gian vs ĐM',
    scope: 'Mục 3 (Biểu đồ ngang)',
    formula: 'So sánh StandardProdTime vs ActualProdTime',
    source: 'Cột TimeStatus trong _ERPPlanDetail',
    description: 'Phân loại lệnh theo: Chậm hơn ĐM, Nhanh hơn ĐM, Đúng ĐM, Chưa có dữ liệu.'
  },
  {
    id: 'chart_capa_status',
    category: 'CHARTS',
    title: 'Trạng thái Capa (Năng lực thiết bị)',
    columnId: 'CapaStatus',
    columnName: 'Tải Capa',
    scope: 'Mục 4 (Biểu đồ ngang)',
    formula: 'So sánh StandardCapa vs ActualCapa',
    source: 'Cột CapaStatus trong _ERPPlanDetail',
    description: 'Phân loại mức độ đáp ứng năng suất máy: Nhanh hơn ĐM, Chậm hơn ĐM, Trống / Đúng capa.'
  },
  {
    id: 'chart_pic_breakdown',
    category: 'CHARTS',
    title: 'Hiệu quả theo PIC Điều phối',
    columnId: 'PicDp',
    columnName: 'PIC ĐP',
    scope: 'Mục 5 (Bảng & Biểu đồ Xếp hạng)',
    formula: 'Gom nhóm theo PicDp: Tổng lệnh, Tỷ lệ sai ngày, Trượt KH, Khớp SL, Khớp job, Tỷ lệ đạt chuẩn',
    source: 'Cột PicDp trong _ERPPlanDetail',
    description: 'Tổng hợp phân tích hiệu quả điều phối theo từng nhân sự phụ trách.'
  },
  {
    id: 'tbl_operation_no',
    category: 'TABLES',
    title: 'Mã lệnh thao tác',
    columnId: 'OperationNo',
    columnName: 'Lệnh thao tác',
    scope: 'Bảng chi tiết Mục 7',
    formula: 'Mã định danh thao tác gốc',
    source: 'Cột OperationNo',
    description: 'Mã số quản lý lệnh thao tác chi tiết trên hệ thống sản xuất.'
  },
  {
    id: 'tbl_routing_doc',
    category: 'TABLES',
    title: 'Số chỉ thị / Lệnh SX',
    columnId: 'RoutingDocNo',
    columnName: 'Số chỉ thị',
    scope: 'Bảng chi tiết Mục 7',
    formula: 'Số hồ sơ quy trình công nghệ',
    source: 'Cột RoutingDocNo / RoutingDocDate',
    description: 'Số chứng từ kế hoạch và ngày lập chỉ thị ban đầu.'
  }
]

export const PlanFormulaHandbookModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')

  if (!isOpen) return null

  const filteredFormulas = PLAN_FORMULA_DATABASE.filter((item) => {
    const matchCat = activeCategory === 'ALL' || item.category === activeCategory
    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchCat
    const matchText =
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.columnId && item.columnId.toLowerCase().includes(q)) ||
      (item.columnName && item.columnName.toLowerCase().includes(q)) ||
      (item.scope && item.scope.toLowerCase().includes(q)) ||
      (item.formula && item.formula.toLowerCase().includes(q)) ||
      (item.source && item.source.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    return matchCat && matchText
  })

  const kpiCount = PLAN_FORMULA_DATABASE.filter((f) => f.category === 'KPI').length
  const chartsCount = PLAN_FORMULA_DATABASE.filter((f) => f.category === 'CHARTS').length
  const tablesCount = PLAN_FORMULA_DATABASE.filter((f) => f.category === 'TABLES').length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: 'clamp(980px, 88vw, 1300px)',
          height: 'clamp(620px, 85vh, 880px)',
          maxHeight: '94vh',
          maxWidth: '96vw',
          border: '1.5px solid #245d6c',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#245d6c',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1a4550',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div
                style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.2 }}
              >
                SỔ TAY CÔNG THỨC & TỪ ĐIỂN CHỈ SỐ ĐIỀU PHỐI KHSX
              </div>
              <div style={{ fontSize: 11.5, color: '#e0f2fe', marginTop: 2, fontWeight: 500 }}>
                Quy chuẩn phương pháp tính toán, nguồn dữ liệu và vị trí áp dụng báo cáo KHSX GS5 Quế Võ
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: 2,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12
            }}
          >
            ĐÓNG (ESC)
          </button>
        </div>

        {/* Toolbar & Filter Bar */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            flexShrink: 0
          }}
        >
          {/* Tab Categories */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setActiveCategory('ALL')}
              style={{
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: activeCategory === 'ALL' ? 800 : 600,
                color: activeCategory === 'ALL' ? '#ffffff' : '#334155',
                background: activeCategory === 'ALL' ? '#245d6c' : '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                borderRadius: 2
              }}
            >
              Tất cả ({PLAN_FORMULA_DATABASE.length})
            </button>
            <button
              onClick={() => setActiveCategory('KPI')}
              style={{
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: activeCategory === 'KPI' ? 800 : 600,
                color: activeCategory === 'KPI' ? '#ffffff' : '#334155',
                background: activeCategory === 'KPI' ? '#245d6c' : '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                borderRadius: 2
              }}
            >
              Chỉ số KPI ({kpiCount})
            </button>
            <button
              onClick={() => setActiveCategory('CHARTS')}
              style={{
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: activeCategory === 'CHARTS' ? 800 : 600,
                color: activeCategory === 'CHARTS' ? '#ffffff' : '#334155',
                background: activeCategory === 'CHARTS' ? '#245d6c' : '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                borderRadius: 2
              }}
            >
              Biểu đồ phân tích ({chartsCount})
            </button>
            <button
              onClick={() => setActiveCategory('TABLES')}
              style={{
                padding: '4px 12px',
                fontSize: 11.5,
                fontWeight: activeCategory === 'TABLES' ? 800 : 600,
                color: activeCategory === 'TABLES' ? '#ffffff' : '#334155',
                background: activeCategory === 'TABLES' ? '#245d6c' : '#ffffff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                borderRadius: 2
              }}
            >
              Cột bảng chi tiết ({tablesCount})
            </button>
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '4px 8px',
              borderRadius: 2,
              width: 260
            }}
          >
            <Search size={13} color="#64748b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên chỉ số, công thức..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 12,
                marginLeft: 6,
                width: '100%'
              }}
            />
          </div>
        </div>

        {/* Content Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
            {filteredFormulas.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  padding: '14px 16px',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        background:
                          item.category === 'KPI'
                            ? '#e0f2fe'
                            : item.category === 'CHARTS'
                            ? '#fef3c7'
                            : '#f1f5f9',
                        color:
                          item.category === 'KPI'
                            ? '#0369a1'
                            : item.category === 'CHARTS'
                            ? '#b45309'
                            : '#475569',
                        borderRadius: 2
                      }}
                    >
                      {item.category}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{item.scope}</span>
                  </div>

                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                    {item.title}
                  </div>

                  <div style={{ fontSize: 11.5, color: '#334155', marginBottom: 8, lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '8px 10px',
                    borderLeft: '3px solid #245d6c',
                    fontSize: 11.5
                  }}
                >
                  <div style={{ color: '#0f172a', fontWeight: 700, marginBottom: 2 }}>
                    Công thức: <code style={{ color: '#0369a1', fontFamily: 'monospace' }}>{item.formula}</code>
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Nguồn: <strong>{item.source}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#64748b',
            flexShrink: 0
          }}
        >
          <div>Hệ thống điều phối KHSX chuẩn hoá theo tiêu chuẩn GS5 Quế Võ</div>
          <PureButton onClick={onClose} size="small">
            Đóng cửa sổ
          </PureButton>
        </div>
      </div>
    </div>
  )
}
