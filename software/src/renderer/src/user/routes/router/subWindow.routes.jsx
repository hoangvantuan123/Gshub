import { systemsRoutes } from './system.routes'

const mappedSystemSubRoutes = systemsRoutes.map((route) => ({
  ...route,
  path: route.path.replace(/^\/erp\/u\//, '')
}))

export const subWindowRoutes = [...mappedSystemSubRoutes]
