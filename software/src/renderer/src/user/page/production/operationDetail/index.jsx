/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Space, Tag, Empty } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  ApartmentOutlined,
  FilterOutlined
} from '@ant-design/icons'

import { usePagePermissions } from '../../../hooks/usePagePermissions'
import DataPageContainer from '../../../components/layout/DataPageContainer'

export default function OperationDetailPage({
  permissions,
  canCreate,
  canEdit,
  canDelete,
  canView,
  ...restProps
}) {
  const { t } = useTranslation()
  const loadingBarRef = useRef(null)

  const pagePerms = usePagePermissions({
    permissions,
    menuKey: 'production_operation_detail',
    canCreate,
    canEdit,
    canDelete,
    canView,
    ...restProps
  })

  const [searchDocNo, setSearchDocNo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(() => {
    setLoading(true)
    loadingBarRef.current?.continuousStart?.()
    setTimeout(() => {
      setLoading(false)
      loadingBarRef.current?.complete?.()
    }, 400)
  }, [])

  return (
    <DataPageContainer
      loadingBarRef={loadingBarRef}
      actions={
        <div className="flex items-center justify-between w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Tag color="blue" icon={<ApartmentOutlined />}>
              {t('production.operationDetail', 'Chi tiết thao tác sản xuất')}
            </Tag>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleSearch}>
              {t('common.reload', 'Tải lại')}
            </Button>
            <Button icon={<FileExcelOutlined />}>{t('common.exportExcel', 'Xuất Excel')}</Button>
          </Space>
        </div>
      }
      query={
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 max-w-xl">
            <Input
              placeholder={t(
                'production.searchDocNoPlaceholder',
                'Nhập mã lệnh sản xuất, lệnh công đoạn...'
              )}
              value={searchDocNo}
              onChange={(e) => setSearchDocNo(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined className="text-slate-400" />}
              allowClear
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
            >
              {t('common.search', 'Tìm kiếm')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center h-full p-8 text-slate-500">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="text-center">
              <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                {t('production.operationDetailReady', 'Màn hình Chi tiết thao tác sản xuất')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t(
                  'production.operationDetailGuide',
                  'Nhập mã lệnh công đoạn phía trên hoặc chọn từ bảng Lệnh công đoạn để tra cứu chi tiết'
                )}
              </p>
            </div>
          }
        />
      </div>
    </DataPageContainer>
  )
}
