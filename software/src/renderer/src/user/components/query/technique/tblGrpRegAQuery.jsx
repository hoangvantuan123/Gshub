import { useState } from 'react'
import { Descriptions, Input, DatePicker } from 'antd'
import { useTranslation } from 'react-i18next'
const { TextArea } = Input
export default function TblGrpRegAQuery({ keyCode, setKeyCode, tableName, setTableName }) {
  const { t } = useTranslation()

  return (
    <div className=" w-full ">
      <Descriptions size="small" bordered style={{ borderRadius: 0 }} column={2}>
        <Descriptions.Item
          span={2}
          style={{ padding: 0 }}
          label={<span className="uppercase text-[9px] p-2 font-bold">Khóa bảng</span>}
        >
          <Input
            size="small"
            className="w-full rounded-none  p-1 "
            variant="borderless"
            maxLength={300}
            value={keyCode}
            onChange={(e) => setKeyCode(e.target.value)}
          />
        </Descriptions.Item>
        <Descriptions.Item
          style={{ padding: 0 }}
          label={<span className="uppercase text-[9px] p-2 font-bold">Tên bảng</span>}
        >
          <Input
            size="small"
            className="w-full rounded-none  p-1 "
            variant="borderless"
            maxLength={300}
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
          />
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}
