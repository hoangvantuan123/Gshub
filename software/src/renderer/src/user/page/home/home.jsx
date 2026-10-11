/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Input, Spin } from 'antd'
import { SearchOutlined, FolderOpenOutlined, FileTextOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import Logo from '../../../assets/goldsun-logo.png'
import { getMenuData } from '../../../IndexedDB/loadMenuData'

const Home = ({ menuTransForm }) => {
  const [searchText, setSearchText] = useState('')
  const [filteredResults, setFilteredResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [localMenuData, setLocalMenuData] = useState(() => menuTransForm || [])

  // 1. Nạp cấu trúc Menu từ IndexedDB nếu prop chưa sẵn sàng
  useEffect(() => {
    let isMounted = true
    const loadIdbMenu = async () => {
      if (menuTransForm && menuTransForm.length > 0) {
        setLocalMenuData(menuTransForm)
        return
      }
      try {
        const idbRecord = await getMenuData()
        if (idbRecord?.transformedMenu && isMounted) {
          setLocalMenuData(idbRecord.transformedMenu)
        }
      } catch (err) {
        console.warn('Lỗi đọc menu từ IndexedDB tại Home:', err)
      }
    }

    loadIdbMenu()
    return () => {
      isMounted = false
    }
  }, [menuTransForm])

  // 2. Lấy thông tin user đăng nhập
  const userInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('userInfo')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  }, [])

  // 3. Quản lý lịch sử tìm kiếm gần đây
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches')) || []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    if (recentSearches.length) {
      localStorage.setItem('recentSearches', JSON.stringify(recentSearches))
    }
  }, [recentSearches])

  // 4. Tìm kiếm Menu & Submenu từ cấu trúc IndexedDB
  const handleSearch = useCallback(
    (e) => {
      const value = e.target.value.toLowerCase()
      setSearchText(value)

      if (value === '') {
        setFilteredResults([])
        return
      }

      setIsLoading(true)
      const isSubmenuSearch = value.startsWith(':/sub')
      const transformList = localMenuData || []
      let results = []

      if (isSubmenuSearch) {
        const keyword = value.replace(':/sub', '').trim()
        results = transformList
          .map((menu) => {
            const matchedSub = menu.subMenu?.filter((sub) =>
              sub.MenuLabel?.toLowerCase().includes(keyword)
            )
            if (matchedSub && matchedSub.length > 0) {
              return {
                ...menu,
                subMenu: matchedSub
              }
            }
            return null
          })
          .filter(Boolean)
      } else {
        results = transformList
          .map((menu) => {
            const matchMain = menu.MenuLabel?.toLowerCase().includes(value)
            const matchedSub = menu.subMenu?.filter((sub) => {
              const matchSub = sub.MenuLabel?.toLowerCase().includes(value)
              const matchChild = sub.menuItems?.some((item) =>
                item.MenuLabel?.toLowerCase().includes(value)
              )
              return matchSub || matchChild
            })
            if (matchMain || (matchedSub && matchedSub.length > 0)) {
              return {
                ...menu,
                subMenu: matchedSub || []
              }
            }
            return null
          })
          .filter(Boolean)
      }

      setFilteredResults(results)
      setIsLoading(false)

      if (value && !recentSearches.includes(value)) {
        setRecentSearches((prev) => [value, ...prev.filter((item) => item !== value).slice(0, 4)])
      }
    },
    [localMenuData, recentSearches]
  )

  const handleRecentSearchClick = useCallback(
    (search) => {
      handleSearch({ target: { value: search } })
    },
    [handleSearch]
  )

  return (
    <div className="bg-white h-full flex flex-col overflow-auto">
      <div className="flex flex-col items-center mt-6 text-center px-4">
        <img
          src={Logo}
          className="h-14 w-auto max-w-[200px] cursor-pointer object-contain mb-3 drop-shadow-xs transition-transform hover:scale-105"
          alt="Goldsun Logo"
        />
        <h2 className="text-2xl font-semibold text-gray-800">
          Chào bạn, <span className="text-blue-600">{userInfo?.UserName ?? 'Người dùng'}!</span>
        </h2>
        <p className="text-gray-500 mt-1">Bạn muốn làm gì hôm nay?</p>
      </div>

      <div className="w-full max-w-3xl mx-auto flex-grow mt-6 px-4 mb-28">
        {searchText ? (
          isLoading ? (
            <div className="flex justify-center">
              <Spin size="large" />
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="space-y-6">
              {filteredResults.map((menu, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                    <FolderOpenOutlined className="text-gray-400" />
                    <span>{menu.MenuLabel}</span>
                  </div>
                  <ul className="pl-6 space-y-1">
                    {menu.subMenu?.map((sub, j) => (
                      <li key={j}>
                        <Link
                          to={sub.MenuLink}
                          onClick={() => {
                            setSearchText('')
                            setFilteredResults([])
                          }}
                          className="cursor-pointer w-full flex gap-2 hover:bg-gray-100 rounded-lg p-2 bg-slate-50 border-gray-200 transition-all duration-200 transform hover:scale-105"
                        >
                          <FileTextOutlined className="text-gray-500 text-[14px]" />
                          <span>{sub.MenuLabel}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 p-2 text-sm">Không tìm thấy kết quả</div>
          )
        ) : (
          <div className="w-full">
            <h3 className="font-semibold text-xs italic opacity-75 text-gray-700 mb-4">
              Tìm kiếm gần đây
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="cursor-pointer hover:bg-gray-100 rounded-lg p-2 bg-slate-50 border-gray-200 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center space-x-3">
                    <SearchOutlined className="text-blue-500 text-xs" />
                    <span className="text-xs text-gray-700">{search}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto sticky bottom-0 bg-white w-full flex justify-center px-4 py-4">
        <div className="w-full max-w-2xl">
          <Input
            size="large"
            placeholder="Tìm kiếm hành động hoặc menu..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearch}
            className="rounded-full px-4 py-2 shadow-lg"
          />
        </div>
      </div>
    </div>
  )
}

export default Home
