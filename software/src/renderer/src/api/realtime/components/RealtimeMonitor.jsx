import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Tag,
  Table,
  Space,
  Typography,
  Badge,
  Row,
  Col,
  Divider,
  Alert,
  Statistic,
  Tabs,
  Select
} from 'antd'
import {
  WifiOutlined,
  KeyOutlined,
  UserOutlined,
  GlobalOutlined,
  ClusterOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  LockOutlined,
  DesktopOutlined,
  TableOutlined
} from '@ant-design/icons'
import { DataEditor, GridCellKind } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { useRealtimeContext } from '../context/RealtimeContext'

const { Title, Text } = Typography
const { Option } = Select

export default function RealtimeMonitor() {
  const isElectron = typeof window !== 'undefined' && Boolean(window.electron)
  const { status, isConnected, events, latestEvent, currentUser } = useRealtimeContext()

  const [topic, setTopic] = useState('erp.auth.events')

  // Live Metrics State
  const [stats, setStats] = useState({
    total_connections: 0,
    topic_counts: {},
    sessions: []
  })

  // Kafka Logs Inspector State
  const [kafkaStats, setKafkaStats] = useState({
    topic: 'erp.auth.events',
    first_offset: 0,
    last_offset: 0,
    total_messages: 0,
    recent_logs: []
  })

  const getMonitorHost = () => window.location.hostname || 'localhost'
  const getMonitorProtocol = () => (window.location.protocol === 'https:' ? 'https:' : 'http:')

  const fetchStats = async () => {
    try {
      const res = await fetch(`${getMonitorProtocol()}//${getMonitorHost()}:50056/api/stats`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (_) {}
  }

  const fetchKafkaLogs = async () => {
    try {
      const res = await fetch(
        `${getMonitorProtocol()}//${getMonitorHost()}:50056/api/kafka/inspector?topic=${encodeURIComponent(topic)}`
      )
      if (res.ok) {
        const data = await res.json()
        setKafkaStats(data)
      }
    } catch (_) {}
  }

  // Tải dữ liệu ban đầu hoặc khi người dùng đổi Topic trong Inspector
  useEffect(() => {
    fetchStats()
    fetchKafkaLogs()
  }, [topic])

  // Cập nhật số lượng Live Connections trực tiếp từ Payload bản tin Stream (0ms, 0 HTTP Request)
  useEffect(() => {
    if (!latestEvent) return
    try {
      if (
        typeof latestEvent.payload === 'string' &&
        latestEvent.payload.includes('CLIENT_STATS_UPDATED')
      ) {
        const parsed = JSON.parse(latestEvent.payload)
        if (parsed.total_connections !== undefined) {
          setStats((prev) => ({ ...prev, total_connections: parsed.total_connections }))
        }
      }
    } catch (_) {}
  }, [latestEvent])

  const getStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge
            status="success"
            text={
              <Text type="success" bold>
                REALTIME CONNECTED (LIVE)
              </Text>
            }
          />
        )
      case 'CONNECTING':
        return (
          <Badge
            status="processing"
            text={
              <Text type="warning" bold>
                CONNECTING TO HUB...
              </Text>
            }
          />
        )
      case 'AUTH_ERROR':
        return (
          <Badge
            status="error"
            text={
              <Text type="danger" bold>
                AUTHENTICATION ERROR
              </Text>
            }
          />
        )
      default:
        return (
          <Badge
            status="default"
            text={
              <Text type="secondary" bold>
                DISCONNECTED
              </Text>
            }
          />
        )
    }
  }

  // Cấu hình Cột Bảng @glideapps/glide-data-grid cho danh sách Sessions Đang Kết Nối Live
  const glideColumns = [
    { title: 'Phần mềm / Giao thức Kết nối', id: 'client_type', width: 250 },
    { title: 'Tài khoản Xác thực', id: 'user_id', width: 170 },
    { title: 'Mã Thiết bị (Device ID)', id: 'device_id', width: 240 },
    { title: 'Session ID', id: 'id', width: 280 },
    { title: 'Cổng IP / Endpoint', id: 'remote_ip', width: 160 },
    { title: 'Kafka Topic', id: 'topic', width: 150 },
    { title: 'Thời điểm Kết nối', id: 'joined_at', width: 170 },
    { title: 'Tín hiệu Cuối', id: 'last_seen', width: 130 },
    { title: 'Trạng thái Live (Tự Dọn Dẹp)', id: 'status', width: 180 }
  ]

  const getGlideCellContent = useCallback(
    ([col, row]) => {
      const sessionList = stats.sessions || []
      const item = sessionList[row]
      if (!item) {
        return { kind: GridCellKind.Text, data: '', displayData: '', allowOverlay: false }
      }

      const colId = glideColumns[col]?.id
      let textVal = ''

      switch (colId) {
        case 'client_type':
          textVal =
            item.client_type === 'ELECTRON_DESKTOP'
              ? 'Desktop App (gRPC Stream :50055)'
              : 'Chrome Browser (WebSocket :50056)'
          break
        case 'user_id':
          textVal = `${item.user_id || 'USER'} [VALIDATED]`
          break
        case 'device_id':
          textVal = item.device_id || 'DEV_LOCAL'
          break
        case 'id':
          textVal = item.id || ''
          break
        case 'remote_ip':
          textVal = item.remote_ip || 'Internal Stream'
          break
        case 'topic':
          textVal = item.topic || '*'
          break
        case 'joined_at':
          textVal = item.joined_at ? new Date(item.joined_at).toLocaleTimeString() : 'N/A'
          break
        case 'last_seen':
          textVal = item.last_seen || '0s ago'
          break
        case 'status':
          textVal = item.status || 'ONLINE & ACTIVE'
          break
        default:
          textVal = ''
      }

      return {
        kind: GridCellKind.Text,
        data: textVal,
        displayData: textVal,
        allowOverlay: true
      }
    },
    [stats.sessions]
  )

  // Cấu hình Bảng Ant Design hiển thị Luồng Sự kiện Realtime Live
  const eventColumns = [
    {
      title: 'Kafka Topic',
      dataIndex: 'topic',
      key: 'topic',
      width: 180,
      render: (text) => <Tag color="cyan">{text || 'erp.auth.events'}</Tag>
    },
    {
      title: 'Offset',
      dataIndex: 'offset',
      key: 'offset',
      width: 110,
      render: (val) => <Tag color="purple">#{val}</Tag>
    },
    {
      title: 'Event ID',
      dataIndex: 'event_id',
      key: 'event_id',
      width: 160,
      render: (text) => <Text code>{text ? text.substring(0, 12) + '...' : 'SYSTEM'}</Text>
    },
    {
      title: 'Nội dung Payload Realtime Push',
      dataIndex: 'payload',
      key: 'payload',
      render: (val) => (
        <Text code style={{ color: '#096dd9', whiteSpace: 'pre-wrap' }}>
          {val}
        </Text>
      )
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (ts) => (ts ? new Date(ts).toLocaleTimeString() : 'N/A')
    }
  ]

  // Cấu hình Bảng hiển thị Kafka Commit Log Inspector
  const kafkaColumns = [
    {
      title: 'Offset',
      dataIndex: 'offset',
      key: 'offset',
      width: 110,
      render: (val) => <Tag color="purple">#{val}</Tag>
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 160,
      render: (text) => <Text code>{text || 'EMPTY'}</Text>
    },
    {
      title: 'Bản tin Commit Log trong Kafka Broker',
      dataIndex: 'value',
      key: 'value',
      render: (val) => (
        <Text code style={{ color: '#262626', whiteSpace: 'pre-wrap' }}>
          {val}
        </Text>
      )
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180
    }
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <ClusterOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0 }}>
                  Giám sát Hạ tầng Realtime Stream & Kafka Inspector
                </Title>
              </Space>
            }
            extra={getStatusBadge()}
          >
            {/* Banner Thông tin User Đăng nhập */}
            {currentUser?.isAuthenticated ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={
                  <Space split={<Divider type="vertical" />}>
                    <span>
                      <UserOutlined /> <b>Tài khoản:</b> {currentUser.userName} (
                      {currentUser.userId})
                    </span>
                    <span>
                      <KeyOutlined /> <b>IDSeq:</b> #{currentUser.userSeq}
                    </span>
                    <span>
                      <LockOutlined /> <b>Xác thực Token:</b>{' '}
                      <Tag color="green">VALIDATED & ACTIVE</Tag>
                    </span>
                    <span>
                      <b>Chế độ kết nối:</b>{' '}
                      {isElectron ? 'gRPC Stream (:50055)' : 'WebSocket Gateway (:50056)'}
                    </span>
                  </Space>
                }
                description="Realtime Stream đã tự động kết nối và lắng nghe sự kiện tức thì dựa trên phiên đăng nhập hợp lệ."
                style={{ marginBottom: 16 }}
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                message="Chưa xác thực tài khoản người dùng ERP"
                description="Vui lòng đăng nhập hệ thống để tự động kích hoạt kết nối Realtime Stream."
                style={{ marginBottom: 16 }}
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => (window.location.href = '#/erp/u/login')}
                  >
                    Đăng nhập ngay
                  </Button>
                }
              />
            )}

            {/* Metric Overview */}
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                  <Statistic
                    title="Tổng số Client Kết nối Live"
                    value={stats.total_connections || (isConnected ? 1 : 0)}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
                  <Statistic
                    title="Luồng Sự kiện Đã Nhận"
                    value={events.length}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<ThunderboltOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3ade6' }}>
                  <Statistic
                    title="Kafka Messages trong Topic"
                    value={kafkaStats.total_messages || 0}
                    valueStyle={{ color: '#722ed1' }}
                    prefix={<DatabaseOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fff7e6', borderColor: '#ffd591' }}>
                  <Statistic
                    title="Chế độ Hoạt động"
                    value={isElectron ? 'Electron Native' : 'Browser Web'}
                    valueStyle={{ color: '#fa8c16', fontSize: '18px' }}
                    prefix={isElectron ? <WifiOutlined /> : <GlobalOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Tabs Chức năng Chỉnh: Glide Data Grid Sessions, Live Event Stream, Kafka Commit Log Inspector */}
      <Tabs defaultActiveKey="1" type="card">
        <Tabs.TabPane
          tab={
            <span>
              <TableOutlined /> Glide Data Grid - Danh sách Thiết bị Live (
              {stats.sessions?.length || 0})
            </span>
          }
          key="1"
        >
          <Card title="Glide Data Grid Hiệu Năng Cao - Chi tiết các Thiết bị Desktop App & Browser Đang Kết nối Live">
            <div
              style={{
                height: 420,
                width: '100%',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #d9d9d9'
              }}
            >
              <DataEditor
                width="100%"
                height="100%"
                columns={glideColumns}
                rows={stats.sessions?.length || 0}
                getCellContent={getGlideCellContent}
                smoothScrollX={true}
                smoothScrollY={true}
                rowMarkers="number"
              />
            </div>
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <ThunderboltOutlined /> Luồng Sự kiện Realtime Live ({events.length})
            </span>
          }
          key="2"
        >
          <Card
            title={`Danh sách bản tin Sự kiện nhận từ Kafka Topic (${topic})`}
            extra={<Tag color="blue">{events.length} bản tin</Tag>}
          >
            <Table
              dataSource={events}
              columns={eventColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              rowKey={(record) => record.event_id || Math.random().toString()}
            />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <DatabaseOutlined /> Kafka Commit Log Inspector
            </span>
          }
          key="3"
        >
          <Card
            title={`Kiểm tra Bản tin Commit Log trực tiếp từ Kafka Broker (Offset: ${kafkaStats.first_offset} -> ${kafkaStats.last_offset})`}
            extra={
              <Space>
                <Text>Topic:</Text>
                <Select value={topic} onChange={setTopic} style={{ width: 220 }}>
                  <Option value="erp.auth.events">erp.auth.events</Option>
                  <Option value="erp.warehouse.events">erp.warehouse.events</Option>
                  <Option value="erp.client.events">erp.client.events</Option>
                </Select>
              </Space>
            }
          >
            <Table
              dataSource={kafkaStats.recent_logs}
              columns={kafkaColumns}
              pagination={false}
              size="small"
              rowKey={(record) => record.offset}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}
