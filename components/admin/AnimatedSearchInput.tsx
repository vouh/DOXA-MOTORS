'use client'

import { useEffect, useRef, useState } from 'react'

const SAMPLES = [
  'Find by name…',
  'James Otieno',
  'Find by National ID…',
  '12345678',
  'Find by phone…',
  '0712 345 678',
  'Find by licence…',
  '1234567890',
]

type Props = {
  name?: string
  value?: string
  defaultValue?: string
  className?: string
  onChange?: (value: string) => void
  onFocusChange?: (focused: boolean) => void
  onSubmit?: () => void
}

export default function AnimatedSearchInput({
  name = 'q',
  value,
  defaultValue = '',
  className = '',
  onChange,
  onFocusChange,
  onSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const controlled = value !== undefined
  const [focused, setFocused] = useState(false)
  const [internal, setInternal] = useState(defaultValue)
  const text = controlled ? value : internal
  const hasText = Boolean(text.trim())
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
    <div className="group relative min-w-0 flex-1">
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap text-sm text-on-surface-variant/70 dark:text-blue-200/40 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {display}
        <span
          className={`ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-primary align-middle ${
            animate ? 'animate-pulse' : 'opacity-0'
          }`}
        />
      </span>

      {/* Bottom glow on focus — no ring / box border */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px origin-center transition-all duration-300 ${
          focused
            ? 'h-[2px] scale-x-100 bg-primary shadow-[0_0_10px_2px_rgba(37,99,235,0.45)]'
            : 'scale-x-100 bg-outline-variant dark:bg-[#1e3a5f]'
        }`}
      />

      <input
        ref={inputRef}
        className={`w-full border-0 bg-transparent focus:outline-none focus:ring-0 ${className} ${
          animate ? 'caret-transparent placeholder:text-transparent' : ''
        }`}
        name={name}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
        placeholder={focused || hasText ? 'Find by name, National ID or phone' : ' '}
        autoComplete="off"
        onFocus={() => {
          setFocused(true)
          onFocusChange?.(true)
        }}
        onBlur={() => {
          setFocused(false)
          onFocusChange?.(false)
        }}
        onChange={(e) => {
          const next = e.currentTarget.value
          if (!controlled) setInternal(next)
          onChange?.(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit?.()
          }
        }}
      />
    </div>
  )
}
