import { useState } from 'react'
import { Descriptions, Input, DatePicker } from 'antd'
import { useTranslation } from 'react-i18next'
const { TextArea } = Input
export default function TblGrpRegBQuery({ dataType }) {
  const { t } = useTranslation()

  return (
    <div className=" w-full ">
      <Descriptions size="small" bordered style={{ borderRadius: 0 }} column={2}>
        <Descriptions.Item
          style={{ padding: 0 }}
          label={<span className="uppercase text-[9px] p-2 font-bold">Khóa bảng</span>}
        >
          <Input
            size="small"
            className="w-full rounded-none  p-1 "
            variant="borderless"
            maxLength={300}
            readOnly
            value={dataType?.[0]?.KeyCode ? dataType[0].KeyCode : ''}
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
            readOnly
            value={dataType?.[0]?.TableName ? dataType[0].TableName : ''}
          />
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}
