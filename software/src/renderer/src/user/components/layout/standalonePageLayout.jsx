/* eslint-disable react/prop-types */
import { Suspense, useMemo } from 'react'
import { Layout } from 'antd'
import TitleBar from '../header/titleBar'
import Spinner from '../../page/default/load'
import StatusBar from '../status/StatusBar'

const { Content } = Layout

export default function StandalonePageLayout({
  children,
  title = 'GsHub ERP',
  rootMenu = [],
  menuTransForm = []
}) {
  const userName = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}')?.UserName || 'User'
    } catch {
      return 'User'
    }
  }, [])

  return (
    <Layout className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 select-none">
      <TitleBar title={title} />
      <Content className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative bg-slate-50">
        <Suspense fallback={<Spinner />}>{children}</Suspense>
      </Content>
      <StatusBar rootMenu={rootMenu} menuTransForm={menuTransForm} userName={userName} />
    </Layout>
  )
}
