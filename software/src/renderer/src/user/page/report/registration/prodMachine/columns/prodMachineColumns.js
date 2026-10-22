import { MACHINE_COMPARISON_COLUMN_SCHEMA } from '../../../production/calcProduction/constants/calcConstants'

export const PROD_MACHINE_COLUMNS = MACHINE_COMPARISON_COLUMN_SCHEMA.map((column) => ({
  title: column.title,
  id: column.key,
  group: column.group,
  kind: column.kind === 'Number' ? 'Number' : 'Text',
  readonly: true,
  width: column.width,
  hasMenu: true,
  visible: true,
  trailingRowOptions: { disabled: true }
}))
