import { Row, Col, Input, InputNumber } from 'antd'

export default function DictLangQuery({
  setWordsSearch,
  wordsSearch,
  dataType,
  setWordSeq,
  wordSeq
}) {
  const labelStyle =
    'flex items-center justify-start bg-gray-50 border-r px-2 font-bold text-[9px] uppercase min-w-[120px] h-full'
  const inputStyle = 'flex-1 h-full flex items-center'

  return (
    <div className="w-full bg-white border-b">
      <Row className="flex items-stretch h-[29px] border-b">
        <Col span={8} className="flex items-center border-r h-full">
          <div className={labelStyle}>Ngôn ngữ</div>
          <div className={inputStyle}>
            <Input
              size="small"
              variant="borderless"
              className="w-full p-1 h-full text-[11px]"
              readOnly
              value={dataType[0]?.LanguageName || ''}
              placeholder="Chọn ngôn ngữ từ bảng bên..."
            />
          </div>
        </Col>
        <Col span={8} className="flex items-center border-r h-full">
          <div className={labelStyle}>Mã từ điển</div>
          <div className={inputStyle}>
            <InputNumber
              size="small"
              variant="borderless"
              className="w-full p-0 h-full text-[11px] custom-input-number-borderless"
              min={0}
              value={wordSeq}
              onChange={(value) => setWordSeq(value)}
              placeholder="Nhập mã từ điển..."
              style={{ width: '100%' }}
            />
          </div>
        </Col>
        <Col span={8} className="flex items-center h-full">
          <div className={labelStyle}>Từ điển</div>
          <div className={inputStyle}>
            <Input
              size="small"
              variant="borderless"
              className="w-full p-1 h-full text-[11px]"
              value={wordsSearch}
              onChange={(e) => setWordsSearch(e.target.value)}
              placeholder="Nhập từ hoặc mô tả..."
              allowClear
              maxLength={450}
            />
          </div>
        </Col>
      </Row>
    </div>
  )
}
