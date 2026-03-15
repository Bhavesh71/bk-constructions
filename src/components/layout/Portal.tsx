'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<Element | null>(null)

  useEffect(() => {
    ref.current = document.body
    setMounted(true)
    return () => { setMounted(false) }
  }, [])

  return mounted && ref.current ? createPortal(children, ref.current) : null
}
