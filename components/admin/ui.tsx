'use client'

import React from 'react'

export function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'Active' || status === 'Hired'  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'   :
    status === 'Suspended'                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'           :
    status === 'Maintenance'                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'   :
    status === 'Returned'                       ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'          :
                                                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  )
}

export function Btn({
  label, icon, variant = 'ghost', onClick,
}: { label: string; icon: string; variant?: 'ghost' | 'primary' | 'danger'; onClick?: () => void }) {
  const cls =
    variant === 'primary' ? 'bg-primary text-white hover:bg-primary-container border-transparent' :
    variant === 'danger'  ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                            'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant dark:bg-[#111f36] dark:text-blue-100 dark:border-[#1a2d4f] dark:hover:bg-[#162a48]'
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
    <div className={`bg-white dark:bg-[#0d1729] rounded-xl border border-outline-variant dark:border-[#1a2d4f] shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Th({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-surface-container-low dark:bg-[#0a1628] border-b border-outline-variant dark:border-[#1a2d4f]">
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

export function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-h3 text-[18px] font-bold text-on-surface dark:text-blue-50">{title}</h2>
      {action}
    </div>
  )
}
