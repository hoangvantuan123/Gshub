import { useState } from 'react'
import { Button, Dropdown, Menu, message, Input, Space, Form, InputNumber } from 'antd'
import {
  SaveOutlined,
  PlusOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  DownOutlined,
  ExportOutlined,
  SettingOutlined,
  TableOutlined,
  SearchOutlined
} from '@ant-design/icons'

export default function DictSysActions({
  handleDeleteDataSheet,
  handleSaveData,
  fetchData,
  handleSearchData
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        icon={<SearchOutlined />}
        size="small"
        onClick={handleSearchData}
        color="default"
        variant="text"
        className="uppercase"
      >
        TÌM KIẾM
      </Button>
      <Button
        icon={<SaveOutlined />}
        size="small"
        className="uppercase"
        color="default"
        variant="text"
        onClick={handleSaveData}
      >
        LƯU
      </Button>
      <Button
        icon={<DeleteOutlined />}
        size="small"
        className="uppercase"
        onClick={handleDeleteDataSheet}
        color="default"
        variant="text"
        style={{ backgroundColor: 'white', color: 'black' }}
      >
        XÓA
      </Button>
    </div>
  )
}
