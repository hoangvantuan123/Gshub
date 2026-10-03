/* eslint-disable react/prop-types */
import { FormulaHandbookModal as SharedModal } from '../../../handbook/FormulaHandbookModal'

export const FormulaHandbookModal = (props) => {
  return <SharedModal defaultReportType="stat" {...props} />
}

export default FormulaHandbookModal
