import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Splitter, SplitterPanel } from 'primereact/splitter'
import { Menu } from 'antd'
import TopLoadingBar from 'react-top-loading-bar'
import {
  UserOutlined,
  SettingOutlined,
  BellOutlined,
  LockOutlined,
  GlobalOutlined,
  MobileOutlined,
  UsergroupAddOutlined,
  KeyOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons'
import Profile from './profile'
import Preferences from './preferences'
import Account from './account'
export default function SettingPrivate() {
  const { t } = useTranslation()
  const userFromLocalStorage = JSON.parse(localStorage.getItem('userInfo'))
  const loadingBarRef = useRef(null)
  const [selectedKey, setSelectedKey] = useState('profile')

  const items = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: <UserOutlined />,
      children: (
        <>
          <Profile />
        </>
      )
    },
    {
      key: 'preferences',
      label: 'Tùy chỉnh',
      icon: <SettingOutlined />,
      children: <Preferences />
    },
    {
      key: 'account',
      label: 'Tài khoản',
      icon: <LockOutlined />,
      children: <Account />
    },
    {
      key: 'notifications',
      label: 'Thông báo',
      icon: <BellOutlined />,
      children: <></>
    }
  ]

  return (
    <>
      <TopLoadingBar color="blue" height={2} ref={loadingBarRef} />

      <div className="bg-slate-50 h-full overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="w-full p-1 flex flex-col  bg-white border-b ">
            <h2 className=" text-sm font-semibold">
              {userFromLocalStorage.UserName} ({userFromLocalStorage.UserId})
            </h2>
            <h2 className="text-[10px]">Tài khoản cá nhân của bạn</h2>
          </div>

          <div className="flex w-full h-full">
            <Splitter className="w-full h-full">
              {/* Sidebar */}
              <SplitterPanel size={15} minSize={15} className="bg-white border-r">
                <Menu
                  mode="inline"
                  selectedKeys={[selectedKey]}
                  onClick={(e) => setSelectedKey(e.key)}
                  style={{ borderRight: 0 }}
                  items={items.map((item) => ({
                    key: item.key,
                    icon: item.icon,
                    label: <span className="text-xs">{item.label}</span>
                  }))}
                />
              </SplitterPanel>

              {/* Content area */}
              <SplitterPanel size={85} minSize={70}>
                <div className="flex-1 bg-white  p-4 border-l h-full overflow-auto scroll-container pb-20">
                  {items.find((item) => item.key === selectedKey)?.children}
                </div>
              </SplitterPanel>
            </Splitter>
          </div>
        </div>
      </div>
    </>
  )
}
