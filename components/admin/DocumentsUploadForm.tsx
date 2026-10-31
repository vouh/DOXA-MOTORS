'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadRepositoryDocument } from '@/app/actions/documents'

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const label =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

type Option = { id: string; label: string }

export default function DocumentsUploadForm({
  clients,
  vehicles,
  owners,
  onSuccess,
  onBusyChange,
}: {
  clients: Option[]
  vehicles: Option[]
  owners: Option[]
  onSuccess?: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const [entityType, setEntityType] = useState('GENERAL')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [pending, setPending] = useState(false)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const linkOptions = useMemo(() => {
    if (entityType === 'CLIENT') return clients
    if (entityType === 'VEHICLE') return vehicles
    if (entityType === 'OWNER') return owners
    return []
  }, [entityType, clients, vehicles, owners])

  useEffect(() => {
    onBusyChange?.(pending)
  }, [pending, onBusyChange])

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  function startProgress() {
    if (progressTimer.current) clearInterval(progressTimer.current)
    setProgress(5)
    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p
        const step = p < 35 ? 6 : p < 65 ? 3 : 1.2
        return Math.min(88, p + step)
      })
    }, 320)
  }

  function stopProgress(finalValue: number) {
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }
    setProgress(finalValue)
  }

  return (
    <form
      className="grid gap-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (pending) return
        const form = e.currentTarget
        const data = new FormData(form)
        setMessage(null)
        setError(null)
        setPending(true)
        startProgress()

        void (async () => {
          try {
            const result = await uploadRepositoryDocument(data)
            if (result.ok) {
              stopProgress(100)
              setMessage(result.message)
              form.reset()
              setEntityType('GENERAL')
              // Hold at 100% so the bar finishes before the dialog closes.
              closeTimer.current = setTimeout(() => {
                setPending(false)
                onSuccess?.()
              }, 700)
            } else {
              stopProgress(0)
              setError(result.message)
              setPending(false)
            }
          } catch (err) {
            stopProgress(0)
            setError(err instanceof Error ? err.message : 'Upload failed.')
            setPending(false)
          }
        })()
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 sm:col-span-1">
          <span className={label}>Type</span>
          <select className={field} name="kind" defaultValue="OTHER">
            <option value="LOGBOOK">Logbook</option>
            <option value="AGREEMENT">Agreement</option>
            <option value="INSURANCE">Insurance</option>
            <option value="ID_COPY">ID / passport</option>
            <option value="LICENCE">Licence</option>
            <option value="STATEMENT">Spreadsheet</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="col-span-2 sm:col-span-1">
          <span className={label}>Link to</span>
          <select
            className={field}
            name="entityType"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            <option value="GENERAL">General</option>
            <option value="CLIENT">Client</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
      </div>

      {entityType !== 'GENERAL' ? (
        <label>
          <span className={label}>{entityType.charAt(0) + entityType.slice(1).toLowerCase()} *</span>
          <select className={field} name="entityId" required>
            <option value="">Select…</option>
            {linkOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        <span className={label}>Title (optional)</span>
        <input className={field} name="title" placeholder="Short title" maxLength={120} />
      </label>

      <label>
        <span className={label}>File * · PDF, Excel, Word, CSV, JPG, PNG · max 5 MB</span>
        <input
          className={`${field} file:mr-2 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary`}
          name="file"
          type="file"
          accept=".pdf,.xls,.xlsx,.doc,.docx,.csv,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png"
          required
          disabled={pending}
        />
      </label>

      {(pending || progress > 0) && (
        <div className="space-y-1" aria-live="polite">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>
              {progress >= 100
                ? 'Saved'
                : pending
                  ? 'Uploading & compressing…'
                  : 'Upload'}
            </span>
            <span className="font-medium tabular-nums text-on-surface">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/60 dark:bg-[#1e3a5f]">
            <div
              className="h-full rounded-full bg-[#E90809] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {message ? (
        <p className="rounded-md border border-green-500/30 bg-green-50 px-2.5 py-1.5 text-xs text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-error/30 bg-error-container/50 px-2.5 py-1.5 text-xs text-on-error-container">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#C50000] disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
        {pending ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  )
}
