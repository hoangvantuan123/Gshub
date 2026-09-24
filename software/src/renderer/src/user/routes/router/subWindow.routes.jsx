import { lazy } from 'react'
import DefaultPage from '../../page/default/default'
import { systemsRoutes } from './system.routes'

const UserDetailForm = lazy(() => import('../../page/system/userDetailForm'))

const mappedSystemSubRoutes = systemsRoutes.map((route) => ({
  ...route,
  path: route.path.replace(/^\/erp\/u\//, '')
}))

export const subWindowRoutes = [
  ...mappedSystemSubRoutes,
  {
    path: 'system/user-detail/:userSeq',
    element: UserDetailForm,
    permission: 'user_management',
    public: true,
    fallback: DefaultPage
  }
]
