import { useEffect } from 'react'

const useKeydownHandler = (isCellSelected, setOpenHelp) => {
  const checkOpenHelp = (event) => {
    if (
      (event.metaKey && event.shiftKey && event.key === ' ') ||
      (event.ctrlKey && event.shiftKey && event.key === ' ')
    ) {
      setOpenHelp(true)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isCellSelected) {
        checkOpenHelp(event)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCellSelected, setOpenHelp])
}

export default useKeydownHandler
