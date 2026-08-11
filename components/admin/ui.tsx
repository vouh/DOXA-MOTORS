'use client'

import React from 'react'

export function StatusPill({ status }: { status: string }) {
  const key = status.toUpperCase().replace(/\s+/g, '_')
  const cls =
    key === 'ACTIVE' || key === 'HIRED' || key === 'COMPLETED'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : key === 'SUSPENDED' || key === 'FAILED' || key === 'CANCELLED'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : key === 'MAINTENANCE' || key === 'PENDING' || key === 'RESERVED' || key === 'DISPATCHED'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : key === 'RETURNED' || key === 'REFUNDED'
            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  const label = status.includes('_')
    ? status
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ')
    : status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export function Btn({
  label, icon, variant = 'ghost', onClick,
}: { label: string; icon: string; variant?: 'ghost' | 'primary' | 'danger'; onClick?: () => void }) {
  const cls =
    variant === 'primary' ? 'bg-primary text-white hover:bg-primary-container border-transparent' :
    variant === 'danger'  ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                            'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant dark:bg-[#12284a] dark:text-blue-100 dark:border-[#1e3a5f] dark:hover:bg-[#183456]'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${cls}`}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {label}
    </button>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-outline-variant bg-white shadow-[0_12px_40px_rgba(29,34,53,0.08)] dark:border-[#1e3a5f] dark:bg-[#0c1c38] dark:shadow-[0_12px_40px_rgba(2,10,28,0.45)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Th({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-surface-container-low dark:bg-[#091830] border-b border-outline-variant dark:border-[#1e3a5f]">
      <tr>
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold text-on-surface-variant dark:text-blue-200/50 uppercase tracking-wider whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function SectionHead({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3 pl-3 before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.5 before:rounded-full before:bg-secondary-container/70 before:content-['']">
      <div className="min-w-0">
        <h1 className="font-h3 text-xl font-bold tracking-tight text-on-surface dark:text-blue-50">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-on-surface-variant dark:text-blue-200/55">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Consistent vertical rhythm for admin pages */
export function PageShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-6 ${className}`}>{children}</div>
}
