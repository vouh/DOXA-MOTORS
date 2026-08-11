'use client'

import { useEffect, useRef, useState } from 'react'

const SAMPLES = [
  'Find by name…',
  'James Otieno',
  'Find by National ID…',
  '12345678',
  'Find by phone…',
  '0712 345 678',
]

type Props = {
  name?: string
  defaultValue?: string
  className?: string
}

export default function AnimatedSearchInput({
  name = 'q',
  defaultValue = '',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [hasText, setHasText] = useState(Boolean(defaultValue))
  const [display, setDisplay] = useState('')
  const [sampleIndex, setSampleIndex] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing')

  const animate = !focused && !hasText

  useEffect(() => {
    if (!animate) {
      setDisplay('')
      setPhase('typing')
      return
    }

    const full = SAMPLES[sampleIndex % SAMPLES.length]
    let timer: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (display.length < full.length) {
        timer = setTimeout(() => setDisplay(full.slice(0, display.length + 1)), 55)
      } else {
        timer = setTimeout(() => setPhase('pause'), 1400)
      }
    } else if (phase === 'pause') {
      timer = setTimeout(() => setPhase('deleting'), 400)
    } else if (display.length > 0) {
      timer = setTimeout(() => setDisplay(full.slice(0, display.length - 1)), 32)
    } else {
      timer = setTimeout(() => {
        setSampleIndex((i) => (i + 1) % SAMPLES.length)
        setPhase('typing')
      }, 280)
    }

    return () => clearTimeout(timer)
  }, [animate, display, phase, sampleIndex])

  return (
    <div
      className={`group relative min-w-0 flex-1 transition-all duration-300 ${
        focused
          ? 'rounded-lg bg-primary/[0.04] ring-2 ring-primary/35 dark:bg-primary/10 dark:ring-primary/45'
          : ''
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap text-sm text-on-surface-variant/70 dark:text-blue-200/40 ${
          focused ? 'left-3' : 'left-0'
        } ${animate ? 'opacity-100' : 'opacity-0'}`}
      >
        {display}
        <span
          className={`ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-primary align-middle ${
            animate ? 'animate-pulse' : 'opacity-0'
          }`}
        />
      </span>

      <input
        ref={inputRef}
        className={`w-full bg-transparent transition-[padding,border-color] duration-300 ${className} ${
          focused ? 'px-3 py-2.5' : ''
        } ${animate ? 'caret-transparent placeholder:text-transparent' : ''}`}
        name={name}
        defaultValue={defaultValue}
        placeholder={focused || hasText ? 'Find by name, National ID or phone' : ' '}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false)
          setHasText(Boolean(e.currentTarget.value.trim()))
        }}
        onChange={(e) => setHasText(Boolean(e.currentTarget.value.trim()))}
      />
    </div>
  )
}
