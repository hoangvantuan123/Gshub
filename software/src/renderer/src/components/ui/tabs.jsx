/* eslint-disable react/prop-types */
import {
  createContext,
  useState,
  useContext,
  useCallback,
  isValidElement,
  cloneElement,
  Children
} from 'react'

const TabsContext = createContext(null)

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
  orientation = 'horizontal',
  ...props
}) {
  const [selected, setSelected] = useState(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : selected

  const handleSelect = useCallback(
    (val) => {
      if (!isControlled) setSelected(val)
      onValueChange?.(val)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue, onSelect: handleSelect, orientation }}>
      <div className={`tabs-root ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '', variant = 'line', style = {}, ...props }) {
  const isLine = variant === 'line'

  const defaultStyle = isLine
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 20,
        borderBottom: '1px solid #e2e8f0',
        padding: '0 4px',
        background: 'transparent',
        ...style
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        background: '#f1f5f9',
        padding: 4,
        ...style
      }

  return (
    <div
      role="tablist"
      className={`tabs-list ${isLine ? 'tabs-line' : 'tabs-pill'} ${className}`}
      style={defaultStyle}
      {...props}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child
        return cloneElement(child, { variant })
      })}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className = '',
  variant = 'line',
  disabled = false,
  indicatorColor = '#059669',
  style = {},
  ...props
}) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const isSelected = String(context.value) === String(value)
  const isLine = variant === 'line'

  const lineStyle = isLine
    ? {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        paddingTop: 6,
        paddingBottom: 8,
        paddingLeft: 4,
        paddingRight: 4,
        fontSize: 12,
        fontWeight: 600,
        color: isSelected ? '#047857' : '#64748b',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        transition: 'color 0.15s ease-in-out',
        opacity: disabled ? 0.5 : 1,
        ...style
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        borderRadius: 6,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: isSelected ? '#0f172a' : '#64748b',
        background: isSelected ? '#ffffff' : 'transparent',
        boxShadow: isSelected ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        outline: 'none',
        transition: 'all 0.15s ease-in-out',
        opacity: disabled ? 0.5 : 1,
        ...style
      }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => context.onSelect(value)}
      className={`tabs-trigger ${isSelected ? 'active' : ''} ${className}`}
      style={lineStyle}
      {...props}
    >
      <span>{children}</span>
      {isLine && isSelected && (
        <span
          style={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 2.5,
            backgroundColor: indicatorColor,
            borderRadius: '2px 2px 0 0'
          }}
        />
      )}
    </button>
  )
}

export function TabsContent({ value, children, className = '', ...props }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  if (String(context.value) !== String(value)) return null

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`tabs-content focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Tabs
