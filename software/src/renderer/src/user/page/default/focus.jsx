import { Modal, Button } from 'antd'
import { CheckCircleTwoTone } from '@ant-design/icons'

export default function ModalFocus({ status, setStatus, nameFrom }) {
  const customMessage = (
    <div>
      Trạng thái mất kết nối tới <strong className=" uppercase">{nameFrom}</strong>. Vui lòng bấm{' '}
      <strong className=" uppercase">tiếp tục</strong> để thực hiện quét code đơn hàng. Hãy đảm bảo
      màn hình luôn được hiển thị để không bị gián đoạn trong quá trình xử lý.
    </div>
  )

  return (
    <Modal
      centered
      title="Cảnh báo"
      open={!status}
      onOk={() => setStatus(true)}
      onCancel={() => setStatus(true)}
      closable={false}
      footer={false}
    >
      <div className="items-center justify-center flex flex-col">
        {customMessage}
        <Button type="primary" onClick={() => setStatus(true)} className="mt-5 w-full">
          Tiếp Tục
        </Button>
      </div>
    </Modal>
  )
}
