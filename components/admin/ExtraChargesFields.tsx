'use client'

import { COMMENT_MAX, EXTRA_DESC_MAX, EXTRA_MAX_ROWS, onCommentInput } from '@/lib/car-hire/input-rules'

const field =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const labelCls =
  'mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

export type ExtraChargeRow = { key: string; description: string; amount: string }

export function newExtraChargeRow(): ExtraChargeRow {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, description: '', amount: '' }
}

export function extraRowsTotal(rows: ExtraChargeRow[]) {
  return rows.reduce((sum, row) => {
    const amount = Number(row.amount)
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0)
  }, 0)
}

export default function ExtraChargesFields({
  rows,
  onChange,
  hint = 'Optional — fuel, cleaning, a split, or any other add-on.',
}: {
  rows: ExtraChargeRow[]
  onChange: (rows: ExtraChargeRow[]) => void
  hint?: string
}) {
  function update(key: string, patch: Partial<ExtraChargeRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={labelCls + ' mb-0'}>Extra costs</span>
        <button
          type="button"
          disabled={rows.length >= EXTRA_MAX_ROWS}
          onClick={() => onChange([...rows, newExtraChargeRow()])}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add extra cost
        </button>
      </div>
      <p className="text-[11px] text-on-surface-variant">{hint}</p>
      {rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_7.5rem_auto]">
          <input
            className={field}
            name="extraDescription"
            value={row.description}
            maxLength={EXTRA_DESC_MAX}
            placeholder={`What is extra ${index + 1}?`}
            onInput={onCommentInput(EXTRA_DESC_MAX)}
            onChange={(e) => update(row.key, { description: e.target.value })}
          />
          <input
            className={field}
            name="extraAmount"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={row.amount}
            placeholder="KES"
            onChange={(e) => update(row.key, { amount: e.target.value })}
          />
          <button
            type="button"
            aria-label="Remove extra cost"
            onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            className="rounded-lg p-2 text-on-surface-variant hover:bg-error/10 hover:text-[#E90809]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      ))}
    </div>
  )
}

export function CommentBox({
  name,
  defaultValue,
  placeholder = 'Optional',
  rows = 3,
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <textarea
        className={field + ' resize-y min-h-[4.5rem]'}
        name={name}
        rows={rows}
        maxLength={COMMENT_MAX}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onInput={onCommentInput(COMMENT_MAX)}
      />
      <p className="mt-0.5 text-right text-[10px] text-on-surface-variant">Max {COMMENT_MAX} characters</p>
    </div>
  )
}
