import { useState, useEffect } from 'react'
import { Radio, Space, message } from 'antd'
import { Server, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
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
    <div className="space-y-3.5 select-text">
      {/* 1. Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xs font-bold text-slate-900">Máy chủ kết nối</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Lựa chọn môi trường kết nối hệ thống</p>
      </div>

      {/* 2. Lựa chọn Môi trường */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 block">
          Môi trường kết nối (Environment)
        </label>
        <Radio.Group
          value={env}
          onChange={handleEnvChange}
          disabled={isCustom}
          className="w-full space-y-1"
        >
          <Space direction="vertical" className="w-full">
            {SERVER_ENVIRONMENTS.map((item) => (
              <label
                key={item.value}
                className={`flex items-center gap-2.5 p-2 border transition-all cursor-pointer rounded-none text-xs ${
                  env === item.value && !isCustom
                    ? 'border-[#163B2B] bg-emerald-50/40 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                } ${isCustom ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Radio value={item.value} />
                <span className="font-semibold text-xs">{item.label}</span>
                <span className="text-[11px] text-slate-400 ml-auto font-mono">
                  {item.backendUrl}
                </span>
              </label>
            ))}
          </Space>
        </Radio.Group>
      </div>

      {/* 3. Chế độ Tùy chỉnh URL */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex orientation-row items-center justify-between">
          <label className="text-xs font-bold text-slate-700">
            Cổng kết nối API Gateway Endpoint
          </label>
          <button
            type="button"
            onClick={() => {
              const next = !isCustom
              setIsCustom(next)
              if (!next) {
                setApiUrl(getDefaultDataHubUrl(env))
              }
            }}
            className="text-[11px] font-semibold text-[#163B2B] hover:underline cursor-pointer"
          >
            {isCustom ? '← Quay lại mặc định' : '⚙ Tùy chỉnh URL nâng cao'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Server className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={apiUrl}
              disabled={!isCustom}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:9643"
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-none border border-slate-300 font-mono transition-colors ${
                !isCustom
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-white text-slate-900 focus:border-[#163B2B] focus:outline-none'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 4. Kết quả Ping kiểm tra kết nối */}
      {pingResult && (
        <div
          className={`p-2.5 rounded-none border text-xs flex items-center gap-2 ${
            pingResult.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {pingResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">
            {pingResult.success
              ? `Máy chủ phản hồi tốt (${pingResult.ms}ms)`
              : `Kết nối thất bại: ${pingResult.msg}`}
          </span>
        </div>
      )}

      {/* 5. Nút Thao Tác Chuẩn Desktop ERP */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        <button
          type="button"
          disabled={testing}
          onClick={handleTestConnection}
          className="h-7 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 rounded-none text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
          <span>Kiểm tra kết nối</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="h-7 px-4 bg-[#163B2B] hover:bg-[#122e22] active:bg-[#0c2017] text-white border border-[#163B2B] rounded-none text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <span>Lưu cấu hình</span>
        </button>
      </div>
    </div>
  )
}
