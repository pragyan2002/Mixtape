import React from 'react'

export function usePageVisibility(): boolean {
  const [visible, setVisible] = React.useState(() => !document.hidden)

  React.useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
