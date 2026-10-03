import { useState, useEffect } from 'react'
import { Card, Input, Button, Radio, Space, Tag, message, Divider, Alert } from 'antd'
import {
  Server,
  ShieldCheck,
  Zap,
  RefreshCw,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import axios from 'axios'
import {
  getDefaultDataHubUrl,
  getCurrentEnv,
  setCurrentEnv,
  SERVER_ENVIRONMENTS
} from '../../config/serverConfig'

export default function ApiConfigPanel() {
  const [env, setEnv] = useState(getCurrentEnv())
  const [apiUrl, setApiUrl] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [testing, setTesting] = useState(false)
  const [pingResult, setPingResult] = useState(null)

  useEffect(() => {
    const savedCustomUrl = localStorage.getItem('gshub_api_url')
    if (savedCustomUrl) {
      setIsCustom(true)
      setApiUrl(savedCustomUrl)
    } else {
      setApiUrl(getDefaultDataHubUrl(env))
    }
  }, [env])

  const handleEnvChange = (e) => {
    const newEnv = e.target.value
    setEnv(newEnv)
    setCurrentEnv(newEnv)
    if (!isCustom) {
      setApiUrl(getDefaultDataHubUrl(newEnv))
    }
    setPingResult(null)
  }

  const handleSave = () => {
    if (isCustom) {
      if (!apiUrl.trim().startsWith('http')) {
        message.error('URL máy chủ phải bắt đầu bằng http:// hoặc https://')
        return
      }
      localStorage.setItem('gshub_api_url', apiUrl.trim())
    } else {
      localStorage.removeItem('gshub_api_url')
    }
    message.success('Đã lưu cấu hình máy chủ API thành công!')
    window.location.reload()
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setPingResult(null)
    const startTime = Date.now()
    try {
      const target = apiUrl.replace(/\/+$/, '')
      const res = await axios.get(`${target}/health`, { timeout: 5000 })
      const duration = Date.now() - startTime
      if (res.status === 200) {
        setPingResult({ success: true, ms: duration, msg: 'Kết nối thành công!' })
        message.success(`Kết nối tốt (${duration}ms)`)
      } else {
        setPingResult({ success: false, msg: `Mã phản hồi: ${res.status}` })
      }
    } catch (err) {
      setPingResult({
        success: false,
        msg: err.response?.data?.message || err.message || 'Không thể kết nối đến máy chủ'
      })
      message.error('Kết nối máy chủ thất bại')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* 1. Thẻ trạng thái bảo mật */}
      <Card
        className="border-emerald-500/30 shadow-md bg-gradient-to-r from-slate-900 to-slate-800 text-white"
        title={
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
            <ShieldCheck className="w-5 h-5" />
            Trạng Thái Lớp Bảo Mật API (Anti-Theft Active)
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
              <Lock className="w-4 h-4 text-indigo-400" />
              Chữ ký HMAC-SHA256
            </div>
            <Tag color="success">ĐANG BẢO VỆ</Tag>
            <p className="text-xs text-slate-400 mt-1">Ký số hóa toàn bộ payload và tham số URL</p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Chống Replay (Timestamp & Nonce)
            </div>
            <Tag color="processing">30s TTL</Tag>
            <p className="text-xs text-slate-400 mt-1">
              Mỗi request dùng 1 lần, vô hiệu hóa việc sao chép cURL/Postman
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
              <Zap className="w-4 h-4 text-blue-400" />
              Anti-Scraping / Bot Filter
            </div>
            <Tag color="purple">Active</Tag>
            <p className="text-xs text-slate-400 mt-1">
              Giới hạn tần suất và chặn công cụ cào dữ liệu
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Cấu hình Môi trường & Đầu API */}
      <Card
        title={
          <div className="flex items-center gap-2 font-semibold">
            <Server className="w-5 h-5 text-blue-600" />
            Cấu Hình Đầu Kết Nối API Backend
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lựa chọn Môi trường:
            </label>
            <Radio.Group value={env} onChange={handleEnvChange} disabled={isCustom}>
              <Space direction="vertical">
                {SERVER_ENVIRONMENTS.map((item) => (
                  <Radio key={item.value} value={item.value}>
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-gray-400 ml-2">({item.backendUrl})</span>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Chế độ Custom URL máy chủ (Nâng cao):
            </label>
            <Button
              type={isCustom ? 'primary' : 'default'}
              size="small"
              onClick={() => {
                const next = !isCustom
                setIsCustom(next)
                if (!next) {
                  setApiUrl(getDefaultDataHubUrl(env))
                }
              }}
            >
              {isCustom ? 'Đang bật Custom URL' : 'Bật Custom URL'}
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              API Base Gateway Endpoint:
            </label>
            <Input
              value={apiUrl}
              disabled={!isCustom}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:9643 hoặc https://gshub.erpsheet.vn"
              size="large"
              addonBefore={<Server className="w-4 h-4 text-gray-400" />}
            />
          </div>

          {pingResult && (
            <Alert
              type={pingResult.success ? 'success' : 'error'}
              showIcon
              icon={
                pingResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )
              }
              message={
                pingResult.success
                  ? `Máy chủ phản hồi tốt (${pingResult.ms}ms)`
                  : `Kết nối thất bại: ${pingResult.msg}`
              }
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button
              icon={<RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />}
              loading={testing}
              onClick={handleTestConnection}
            >
              Kiểm tra kết nối (Ping Test)
            </Button>
            <Button type="primary" onClick={handleSave}>
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
