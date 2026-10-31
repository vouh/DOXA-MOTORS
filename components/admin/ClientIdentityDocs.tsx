'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getClientIdentityDocs,
  uploadClientIdentityDocument,
} from '@/app/actions/documents'
import type { ClientDocListItem, ClientIdentityDocsStatus } from '@/lib/documents/client-required'
import { CLIENT_ID_COPY, CLIENT_LICENCE_COPY } from '@/lib/documents/client-required'

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

function Slot({
  title,
  kind,
  present,
  clientId,
  onDone,
}: {
  title: string
  kind: typeof CLIENT_ID_COPY | typeof CLIENT_LICENCE_COPY
  present: boolean
  clientId: string
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="rounded-lg border border-outline-variant p-3 dark:border-[#1e3a5f]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-on-surface">{title}</p>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            present
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-[#E90809]/10 text-[#E90809]'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">
            {present ? 'check_circle' : 'upload_file'}
          </span>
          {present ? 'On file' : 'Optional'}
        </span>
      </div>
      <label className="mt-2 block">
        <span className={labelCls}>
          {present ? 'Replace file' : 'Upload PDF, JPG, or PNG *'} · max 5 MB
        </span>
        <input
          className={field}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setError(null)
            setMessage(null)
            const data = new FormData()
            data.set('file', file)
            data.set('entityId', clientId)
            data.set('kind', kind)
            startTransition(async () => {
              const result = await uploadClientIdentityDocument(data)
              if (!result.ok) {
                setError(result.message)
                return
              }
              setMessage(result.message)
              onDone()
            })
          }}
        />
      </label>
      {error ? <p className="mt-1.5 text-[11px] text-[#E90809]">{error}</p> : null}
      {message ? <p className="mt-1.5 text-[11px] text-green-700">{message}</p> : null}
      {pending ? <p className="mt-1.5 text-[11px] text-on-surface-variant">Uploading…</p> : null}
    </div>
  )
}

/** ID + licence copies for a client — required before booking/dispatch. */
export default function ClientIdentityDocs({
  clientId,
  compact = false,
  onStatusChange,
}: {
  clientId: string
  compact?: boolean
  onStatusChange?: (complete: boolean) => void
}) {
  const [status, setStatus] = useState<ClientIdentityDocsStatus | null>(null)
  const [docs, setDocs] = useState<ClientDocListItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoadError(null)
    const result = await getClientIdentityDocs(clientId)
    if (!result.ok) {
      setLoadError(result.message)
      onStatusChange?.(false)
      return
    }
    setStatus(result.status)
    setDocs(result.docs)
    onStatusChange?.(result.status.complete)
  }, [clientId, onStatusChange])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="space-y-2.5">
      {!compact ? (
        <p className="text-[12px] text-on-surface-variant">
          Optional scans — ID and licence numbers on the client record are used for booking.
        </p>
      ) : null}
      {loadError ? (
        <p className="text-[12px] text-[#E90809]">{loadError}</p>
      ) : null}
      <div className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <Slot
          title="National ID / passport copy"
          kind={CLIENT_ID_COPY}
          present={Boolean(status?.hasIdCopy)}
          clientId={clientId}
          onDone={() => void reload()}
        />
        <Slot
          title="Driving licence copy"
          kind={CLIENT_LICENCE_COPY}
          present={Boolean(status?.hasLicenceCopy)}
          clientId={clientId}
          onDone={() => void reload()}
        />
      </div>
      {docs.length ? (
        <ul className="divide-y divide-outline-variant/70 rounded-lg border border-outline-variant text-[12px] dark:border-[#1e3a5f]">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-on-surface">{doc.originalName}</p>
                <p className="text-[10px] text-on-surface-variant">
                  {doc.category === CLIENT_LICENCE_COPY ? 'Licence' : 'ID'} ·{' '}
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <a
                href={`/api/admin/documents/${doc.id}/open`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
              >
                Open
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
