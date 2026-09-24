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

export default function LangSysActions({
  handleDeleteDataSheet,

  handleSaveData,

  handleSearchData
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        color="default"
        variant="text"
        icon={<SearchOutlined />}
        size="small"
        onClick={handleSearchData}
        className="uppercase"
      >
        TÌM KIẾM
      </Button>
      <Button
        color="default"
        variant="text"
        icon={<SaveOutlined />}
        size="small"
        className="uppercase"
        onClick={handleSaveData}
      >
        LƯU
      </Button>
      <Button
        icon={<DeleteOutlined />}
        size="small"
        className="uppercase text-slate-900"
        onClick={handleDeleteDataSheet}
        color="default"
        variant="text"
      >
        XÓA
      </Button>
    </div>
  )
}
