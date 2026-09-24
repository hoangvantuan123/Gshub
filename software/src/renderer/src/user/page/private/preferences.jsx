import { List, Typography, Select, Modal, Button } from 'antd'
import {
  ReloadOutlined,
  GlobalOutlined,
  BgColorsOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useState } from 'react'

export default function Preferences() {
  const [theme, setTheme] = useState('light')
  const [timeFormat, setTimeFormat] = useState('24h')
  const [languageUser, setLanguageUser] = useState(
    localStorage.getItem('lang') || localStorage.getItem('language_user') || 'vi'
  )
  const langOptions = [
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' }
  ]
  const [isModalVisible, setIsModalVisible] = useState(false)

  const handleLanguageChange = (val) => {
    setLanguageUser(val)
    localStorage.setItem('lang', val)
    localStorage.setItem('language_user', JSON.stringify(val))
    window.dispatchEvent(new Event('language-changed'))
    window.dispatchEvent(new Event('storage'))
    setIsModalVisible(true)
  }

  const reloadPage = () => {
    window.location.reload()
  }

  return (
    <div>
      <Typography.Title level={5}>Tùy Chỉnh</Typography.Title>
      <Typography.Text type="secondary" className="text-xs italic">
        Điều chỉnh các cài đặt theo sở thích cá nhân.
      </Typography.Text>
      <List className="mt-4" itemLayout="horizontal">
        <List.Item>
          <List.Item.Meta
            avatar={<GlobalOutlined className="text-lg text-gray-600" />}
            title={<Typography.Text className="text-gray-800">Ngôn ngữ</Typography.Text>}
            description={
              <Typography.Text className="text-xs italic opacity-70">
                Chọn ngôn ngữ hiển thị
              </Typography.Text>
            }
          />
          <Select
            value={languageUser}
            onChange={handleLanguageChange}
            options={langOptions}
            style={{ width: 140 }}
          />
        </List.Item>

        <List.Item>
          <List.Item.Meta
            avatar={<BgColorsOutlined className="text-lg text-gray-600" />}
            title={<Typography.Text className="text-gray-800">Chủ đề</Typography.Text>}
            description={
              <Typography.Text className="text-xs italic opacity-70">
                Thay đổi màu sắc giao diện (Đang phát triển)...
              </Typography.Text>
            }
          />
          <Select
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Sáng' },
              { value: 'dark', label: 'Tối' },
              { value: 'system', label: 'Hệ thống' }
            ]}
            style={{ width: 120 }}
          />
        </List.Item>
        <List.Item>
          <List.Item.Meta
            avatar={<ClockCircleOutlined className="text-lg text-gray-600" />}
            title={<Typography.Text className="text-gray-800">Định dạng thời gian</Typography.Text>}
            description={
              <Typography.Text className="text-xs italic opacity-70">
                12 giờ hoặc 24 giờ (Đang phát triển)...
              </Typography.Text>
            }
          />
          <Select
            value={timeFormat}
            onChange={setTimeFormat}
            options={[
              { value: '12h', label: '12 Giờ' },
              { value: '24h', label: '24 Giờ' }
            ]}
            style={{ width: 120 }}
          />
        </List.Item>
      </List>

      <Modal open={isModalVisible} footer={null} closable={false} maskClosable={false} centered>
        <div className="flex flex-col items-center">
          <ReloadOutlined style={{ fontSize: '50px', color: '#1890ff' }} />
          <Typography.Title level={4} style={{ marginTop: '10px' }}>
            Ngôn ngữ đã được cập nhật
          </Typography.Title>
          <Typography.Text>Vui lòng tải lại trang để áp dụng thay đổi.</Typography.Text>
          <br />
          <Button
            type="primary"
            size="large"
            onClick={reloadPage}
            style={{ marginTop: '20px' }}
            className="w-full"
          >
            Tải lại trang
          </Button>
        </div>
      </Modal>
    </div>
  )
}
