/* eslint-disable react/prop-types, no-unused-vars, no-empty */
import { useState, useCallback } from 'react'

export function useRoleGroupFilter() {
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [searchValues, setSearchValues] = useState({})
  const [dynamicQueryFields, setDynamicQueryFields] = useState([])

  const handleAddQueryField = useCallback((field) => {
    if (!field || !field.key) return
    setDynamicQueryFields((prev) => {
      if (prev.some((f) => f.key === field.key)) return prev
      return [...prev, field]
    })
  }, [])

  const handleRemoveQueryField = useCallback((key) => {
    if (!key) return
    setDynamicQueryFields((prev) => prev.filter((f) => f.key !== key))
    setSearchValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleResetQuery = useCallback(() => {
    setName('')
    setId('')
    setSearchValues({})
    setDynamicQueryFields([])
  }, [])

  const buildSearchParams = useCallback(() => {
    const params = {}

    if (name && name.trim()) {
      params.Name = name.trim()
    }
    if (id && id.trim()) {
      params.Id = id.trim()
    }

    Object.entries(searchValues || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        params[k] = typeof v === 'string' ? v.trim() : v
      }
    })

    return params
  }, [name, id, searchValues])

  return {
    name,
    setName,
    id,
    setId,
    searchValues,
    setSearchValues,
    dynamicQueryFields,
    handleAddQueryField,
    handleRemoveQueryField,
    handleResetQuery,
    buildSearchParams
  }
}
