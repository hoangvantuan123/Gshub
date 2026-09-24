export const saveToLocalStorageSheet = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const loadFromLocalStorageSheet = (key, defaultValue) => {
  try {
    const storedValue = localStorage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : defaultValue
  } catch (error) {
    return defaultValue
  }
}
