import {
  Package,
  Users,
  Settings,
  ShoppingBag,
  Info,
  User,
  FolderOpen,
  LayoutGrid,
  ShoppingCart,
  Wrench,
  CheckCircle2,
  ClipboardList,
  Inbox,
  Bell,
  Network,
  ShieldCheck,
  CircleDollarSign,
  FileCheck,
  SlidersHorizontal,
  Folder,
  FileText,
  Tag,
  CreditCard,
  Calendar,
  Layers,
  Database,
  BarChart3,
  Boxes,
  Truck,
  Warehouse,
  Factory,
  Lock,
  Key,
  KeyRound,
  FileCode,
  FileSpreadsheet,
  Grid,
  List,
  ListTree,
  Table,
  Sliders,
  Workflow,
  Cpu,
  Server,
  Building,
  Building2,
  BookOpen,
  ShieldAlert,
  UserCheck,
  UserCog,
  FolderTree
} from 'lucide-react'

export const iconComponents = {
  // Antd style aliases
  ContainerOutlined: Package,
  TeamOutlined: Users,
  SettingOutlined: Settings,
  ShoppingOutlined: ShoppingBag,
  InfoCircleOutlined: Info,
  UserOutlined: User,
  FolderOpenOutlined: FolderOpen,
  AppstoreAddOutlined: LayoutGrid,
  ShoppingCartOutlined: ShoppingCart,
  ToolOutlined: Wrench,
  CheckCircleOutlined: CheckCircle2,
  ProfileOutlined: ClipboardList,
  InboxOutlined: Inbox,
  BellOutlined: Bell,
  NotificationOutlined: Bell,
  ClusterOutlined: Network,
  SafetyCertificateOutlined: ShieldCheck,
  DollarOutlined: CircleDollarSign,
  ReconciliationOutlined: FileCheck,
  ControlOutlined: SlidersHorizontal,
  FileTextOutlined: FileText,
  TagOutlined: Tag,
  CreditCardOutlined: CreditCard,
  ScheduleOutlined: Calendar,
  WarehouseOutlined: Warehouse,
  FactoryOutlined: Factory,
  TruckOutlined: Truck,
  BarChartOutlined: BarChart3,
  DatabaseOutlined: Database,
  BoxesOutlined: Boxes,
  LockOutlined: Lock,
  KeyOutlined: Key,
  TableOutlined: Table,
  FolderOutlined: Folder,
  BookOutlined: BookOpen,
  UserSwitchOutlined: UserCheck,

  // Direct Lucide names
  Package,
  Users,
  Settings,
  ShoppingBag,
  Info,
  User,
  FolderOpen,
  LayoutGrid,
  ShoppingCart,
  Wrench,
  CheckCircle2,
  ClipboardList,
  Inbox,
  Bell,
  Network,
  ShieldCheck,
  CircleDollarSign,
  FileCheck,
  SlidersHorizontal,
  Folder,
  FileText,
  Tag,
  CreditCard,
  Calendar,
  Layers,
  Database,
  BarChart3,
  Boxes,
  Truck,
  Warehouse,
  Factory,
  Lock,
  Key,
  KeyRound,
  FileCode,
  FileSpreadsheet,
  Grid,
  List,
  ListTree,
  Table,
  Sliders,
  Workflow,
  Cpu,
  Server,
  Building,
  Building2,
  BookOpen,
  ShieldAlert,
  UserCheck,
  UserCog,
  FolderTree
}

export const iconMapping = Object.fromEntries(
  Object.entries(iconComponents).map(([key, Icon]) => [
    key,
    <Icon key={key} size={16} strokeWidth={1.75} />
  ])
)

export const getMenuIcon = (iconName, className = '', size = 15) => {
  if (!iconName) {
    return <Folder size={size} className={className} strokeWidth={1.75} />
  }

  // Exact match
  let IconComponent = iconComponents[iconName]
  if (IconComponent) {
    return <IconComponent size={size} className={className} strokeWidth={1.75} />
  }

  // Clean name without 'Outlined' or lowercase lookup
  const cleanName = String(iconName)
    .replace(/outlined$/i, '')
    .trim()
  const lowerKey = Object.keys(iconComponents).find(
    (k) => k.toLowerCase() === iconName.toLowerCase() || k.toLowerCase() === cleanName.toLowerCase()
  )
  if (lowerKey && iconComponents[lowerKey]) {
    IconComponent = iconComponents[lowerKey]
    return <IconComponent size={size} className={className} strokeWidth={1.75} />
  }

  // Default fallback for unknown icon
  return <Layers size={size} className={className} strokeWidth={1.75} />
}
