import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const useMenuColumns = ({ isFieldVisible, isFieldReadOnly } = {}) => {
  const { t } = useTranslation()

  return useMemo(() => {
    const cols = [
      // ── Cột trạng thái hệ thống
      {
        title: '',
        id: 'WorkingTag',
        kind: 'Text',
        readonly: true,
        width: 45,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#225588', baseFontStyle: '600 12px' }
      },

      // ── Cấu trúc điều hướng
      {
        title: t('system.menu.rootMenuName', 'Root Module (Cấp 1)'),
        id: 'RootMenuName',
        group: 'Cấu trúc điều hướng',
        kind: 'Text',
        readonly: true,
        width: 170,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#4338ca', baseFontStyle: '600 12px' }
      },
      {
        title: t('system.menu.type', 'Loại Menu'),
        id: 'MenuTypeName',
        group: 'Cấu trúc điều hướng',
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        themeOverride: { baseFontStyle: 'bold 11px' }
      },
      {
        title: t('system.menu.label', 'Tên hiển thị Menu'),
        id: 'MenuLabel',
        group: 'Cấu trúc điều hướng',
        kind: 'Text',
        readonly: true,
        width: 220,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#0f172a', baseFontStyle: '600 12px' }
      },

      // ── Định danh & Liên kết
      {
        title: t('system.menu.key', 'Mã Key (Permission)'),
        id: 'MenuKey',
        group: 'Định danh & Liên kết',
        kind: 'Text',
        readonly: true,
        width: 190,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#0369a1', baseFontStyle: '600 12px' }
      },
      {
        title: t('system.menu.link', 'Đường dẫn Route (URL)'),
        id: 'MenuLink',
        group: 'Định danh & Liên kết',
        kind: 'Text',
        readonly: true,
        width: 240,
        hasMenu: true,
        visible: true,
        themeOverride: { textDark: '#2563eb' }
      },

      // ── Giao diện & Hiển thị
      {
        title: t('system.menu.icon', 'Biểu tượng Icon'),
        id: 'MenuIcon',
        group: 'Giao diện & Hiển thị',
        kind: 'Text',
        readonly: true,
        width: 140,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.menu.orderSeq', 'Thứ tự hiển thị'),
        id: 'OrderSeq',
        group: 'Giao diện & Hiển thị',
        kind: 'Number',
        readonly: true,
        width: 100,
        hasMenu: true,
        visible: true
      },
      {
        title: t('system.menu.viewStatus', 'Hiển thị Sidebar'),
        id: 'ViewStatusName',
        group: 'Giao diện & Hiển thị',
        kind: 'Text',
        readonly: true,
        width: 130,
        hasMenu: true,
        visible: true,
        themeOverride: { baseFontStyle: 'bold 11px' }
      }
    ]

    return cols.map((col) => {
      let isVis = col.visible !== false
      let isRO = Boolean(col.readonly)

      if (typeof isFieldVisible === 'function') {
        isVis = isFieldVisible(col.id, isVis)
      }
      if (typeof isFieldReadOnly === 'function') {
        isRO = isFieldReadOnly(col.id, isRO)
      }

      return {
        ...col,
        visible: isVis,
        readonly: isRO
      }
    })
  }, [t, isFieldVisible, isFieldReadOnly])
}
