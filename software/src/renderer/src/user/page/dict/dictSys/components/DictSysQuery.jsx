import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DynamicQueryBar from '../../../../components/query/core/DynamicQueryBar'

export default function DictSysQuery({
  languageSeq = '',
  setLanguageSeq,
  languages = [],
  word = '',
  setWord,
  wordSeq = '',
  setWordSeq,
  handleSearchData,
  disabled = false,
  customFields,
  searchValues = {},
  setSearchValues,
  dynamicQueryFields = [],
  onAddQueryField,
  onRemoveQueryField,
  onResetQuery
}) {
  const { t } = useTranslation()
  const [hiddenKeys, setHiddenKeys] = useState(new Set())

  const languageOptions = useMemo(() => {
    const opts = [{ value: '', label: t('Tất cả ngôn ngữ') }]
    languages.forEach((l) => {
      opts.push({
        value: String(l.LanguageSeq),
        label: `${l.LanguageName} (${l.LanguageCode})`
      })
    })
    return opts
  }, [languages, t])

  const allAvailableFields = useMemo(
    () => [
      {
        key: 'LanguageSeq',
        label: t('system.language', 'Ngôn ngữ'),
        type: 'select',
        options: languageOptions
      },
      {
        key: 'Word',
        label: t('system.word', 'Từ điển (Word)'),
        type: 'text',
        placeholder: 'Nhập từ cần tìm...'
      },
      {
        key: 'WordSeq',
        label: t('system.wordSeq', 'Mã từ điển (WordSeq)'),
        type: 'text',
        placeholder: 'Nhập mã từ...'
      },
      {
        key: 'CreatedAt',
        label: t('system.createdAt', 'Thời gian tạo'),
        type: 'date-range',
        colSpan: 2
      },
      {
        key: 'UpdatedAt',
        label: t('system.updatedAt', 'Thời gian cập nhật'),
        type: 'date-range',
        colSpan: 2
      },
      {
        key: 'CreatedBy',
        label: t('system.createdBy', 'Người tạo'),
        type: 'text',
        placeholder: 'Tìm theo người tạo...'
      },
      {
        key: 'UpdatedBy',
        label: t('system.updatedBy', 'Người cập nhật'),
        type: 'text',
        placeholder: 'Tìm theo người sửa...'
      }
    ],
    [t, languageOptions]
  )

  const defaultFields = useMemo(() => {
    return [
      {
        key: 'LanguageSeq',
        label: t('system.language', 'Ngôn ngữ'),
        type: 'select',
        options: languageOptions,
        visible: !hiddenKeys.has('LanguageSeq')
      },
      {
        key: 'Word',
        label: t('system.word', 'Từ điển (Word)'),
        type: 'text',
        placeholder: 'Nhập từ ngữ...',
        maxLength: 300,
        visible: !hiddenKeys.has('Word')
      },
      {
        key: 'WordSeq',
        label: t('system.wordSeq', 'Mã WordSeq'),
        type: 'text',
        placeholder: 'Nhập mã WordSeq...',
        maxLength: 100,
        visible: !hiddenKeys.has('WordSeq')
      }
    ]
  }, [hiddenKeys, languageOptions, t])

  const combinedFields = useMemo(() => {
    if (customFields) return customFields
    const dynFieldsWithRemove = (dynamicQueryFields || []).map((f) => ({
      ...f,
      placeholder: f.placeholder || `Tìm ${f.label || f.key}...`,
      visible: !hiddenKeys.has(f.key),
      onRemove: onRemoveQueryField ? () => onRemoveQueryField(f.key) : undefined
    }))
    return [...defaultFields, ...dynFieldsWithRemove]
  }, [customFields, defaultFields, dynamicQueryFields, hiddenKeys, onRemoveQueryField])

  const values = useMemo(() => {
    return {
      ...searchValues,
      LanguageSeq: languageSeq,
      Word: word,
      WordSeq: wordSeq
    }
  }, [searchValues, languageSeq, word, wordSeq])

  const handleChange = (keyOrObj, maybeVal) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      if (keyOrObj.LanguageSeq !== undefined && setLanguageSeq) setLanguageSeq(keyOrObj.LanguageSeq)
      if (keyOrObj.Word !== undefined && setWord) setWord(keyOrObj.Word)
      if (keyOrObj.WordSeq !== undefined && setWordSeq) setWordSeq(keyOrObj.WordSeq)
      if (setSearchValues) setSearchValues(keyOrObj)
    } else {
      const key = keyOrObj
      const val = maybeVal
      if (key === 'LanguageSeq' && setLanguageSeq) setLanguageSeq(val)
      else if (key === 'Word' && setWord) setWord(val)
      else if (key === 'WordSeq' && setWordSeq) setWordSeq(val)
      else if (setSearchValues) setSearchValues((prev) => ({ ...prev, [key]: val }))
    }
  }

  const handleToggleField = (key, checked, fieldMeta) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

    if (checked && onAddQueryField) {
      const isDefault = key === 'LanguageSeq' || key === 'Word' || key === 'WordSeq'
      if (!isDefault && !dynamicQueryFields.some((f) => f.key === key)) {
        onAddQueryField(key, fieldMeta?.label || key, fieldMeta)
      }
    }
  }

  const handleReset = () => {
    setHiddenKeys(new Set())
    if (onResetQuery) onResetQuery()
  }

  return (
    <DynamicQueryBar
      fields={combinedFields}
      allAvailableFields={allAvailableFields}
      values={values}
      onChange={handleChange}
      onSearch={handleSearchData}
      disabled={disabled}
      columns={4}
      showSettings={true}
      onToggleField={handleToggleField}
      onResetFields={handleReset}
    />
  )
}
