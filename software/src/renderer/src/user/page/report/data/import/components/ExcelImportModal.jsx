import { useState } from 'react'
import { Modal, Upload, Button, message, Alert } from 'antd'
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { Dragger } = Upload

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess }) {
  const [fileList, setFileList] = useState([])
  const [uploading, setUploading] = useState(false)

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Ngày KHSX': '2026-09-29',
        'Số phiếu / Lệnh SX': 'LSX-20260929-01',
        'Ca SX': 'Ca 1',
        'Tổ sản xuất': 'Tổ In Offset',
        'Mã máy': 'IN-01',
        'Tên máy': 'KBA Rapida 106 - 6 Màu',
        'Mã sản phẩm': 'BOX-IP16-PRO',
        'Tên sản phẩm': 'Hộp cao cấp iPhone 16 Pro Max',
        'Công đoạn': 'In UV',
        'KHSX (Số lượng KH)': 25000,
        'TKSX (Thực tế)': 25200,
        'Số lượng Đạt': 24850,
        'Số lượng Phế': 350,
        'Tỷ lệ Đạt': '98.6%',
        'Tốc độ': 12000,
        'Bắt đầu': '06:00',
        'Kết thúc': '14:00',
        'Trạng thái': 'Hoàn thành',
        'Người phụ trách': 'Nguyễn Văn Hùng',
        'Ghi chú': 'Chạy đúng tiến độ'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_DangKy_KHSX_TKSX')
    XLSX.writeFile(wb, 'Mau_DangKy_KHSX_TKSX_HangNgay.xlsx')
    message.success('Đã tải xuống file mẫu Excel!')
  }

  const handleProcessUpload = () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn tệp Excel trước khi thực hiện!')
      return
    }

    const file = fileList[0]
    setUploading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)

        if (!json || json.length === 0) {
          message.error('File Excel không có dữ liệu hoặc không đúng định dạng!')
          setUploading(false)
          return
        }

        onImportSuccess(json)
        setFileList([])
        setUploading(false)
        onClose()
      } catch (err) {
        message.error('Lỗi khi đọc file Excel: ' + err.message)
        setUploading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const uploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')

      if (!isExcel) {
        message.error('Chỉ chấp nhận file định dạng Excel (.xlsx, .xls)!')
        return Upload.LIST_IGNORE
      }
      setFileList([file])
      return false
    },
    fileList,
    maxCount: 1
  }

  return (
    <Modal
      title="Nhập dữ liệu KHSX & TKSX từ tệp Excel"
      open={isOpen}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="template" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
          Tải file mẫu Excel
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={uploading}
          onClick={handleProcessUpload}
          disabled={fileList.length === 0}
        >
          Nạp dữ liệu vào bảng
        </Button>
      ]}
    >
      <div className="space-y-3 py-2">
        <Alert
          type="info"
          showIcon
          message="Hướng dẫn nhập dữ liệu"
          description="Bạn có thể tải file mẫu Excel về để điền kế hoạch sản xuất (KHSX) và thống kê sản xuất (TKSX) hàng ngày, sau đó kéo thả file vào khung bên dưới để nạp trực tiếp vào bảng."
        />

        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined className="text-blue-500 text-3xl" />
          </p>
          <p className="ant-upload-text text-xs font-semibold text-slate-700">
            Nhấp hoặc kéo thả file Excel vào khu vực này
          </p>
          <p className="ant-upload-hint text-[11px] text-slate-400">
            Hỗ trợ file .xlsx, .xls. Dữ liệu sẽ được điền tự động vào bảng phân tích.
          </p>
        </Dragger>
      </div>
    </Modal>
  )
}
