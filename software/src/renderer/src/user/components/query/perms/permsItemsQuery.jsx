import { Button, Form, Input, Row, Col, Select, Popover } from 'antd'

export default function PermsItemsQuery({ path }) {
  return (
    <div className="flex items-center gap-2 ">
      <Form variant="filled">
        <Row className="gap-4 flex items-center ">
          <Col>
            <Form.Item
              label={<span className="uppercase text-[9px]">NHÓM QUYỀN</span>}
              style={{ marginBottom: 0 }}
              labelCol={{ style: { marginBottom: 2, padding: 0 } }}
              wrapperCol={{ style: { padding: 0 } }}
            >
              <Input size="middle" value={path?.Name} readOnly />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item
              label={<span className="uppercase  text-[9px]">SCREEN NAME</span>}
              style={{ marginBottom: 0 }}
              labelCol={{ style: { marginBottom: 2, padding: 0 } }}
              wrapperCol={{ style: { padding: 0 } }}
            >
              <div className="relative">
                <Input placeholder="" size="middle" value={path?.ScreenName} readOnly />
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  )
}
