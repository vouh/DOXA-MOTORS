'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ClientLookupRow } from '@/app/actions/car-hire'
import AnimatedSearchInput from '@/components/admin/AnimatedSearchInput'
import ClientViewButton from '@/components/admin/ClientViewButton'
import { StatusPill } from '@/components/admin/ui'

const field =
  'w-full border-0 bg-transparent px-0 py-2 text-sm text-on-surface dark:text-blue-50'

type Props = {
  canExport?: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function SearchControls({
  query,
  canExport,
  onChange,
  onSearch,
}: {
  query: string
  canExport: boolean
  onChange: (value: string) => void
  onSearch: () => void
}) {
  const inviting = query.trim().length > 0
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
      <AnimatedSearchInput
        name="q"
        value={query}
        className={field}
        onChange={onChange}
        onSubmit={onSearch}
      />
      <button
        type="button"
        onClick={onSearch}
        className={`rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(12,92,240,0.28)] hover:opacity-95 ${
          inviting ? 'search-btn-beam ring-2 ring-primary/40 ring-offset-2 ring-offset-white dark:ring-offset-[#0a1628]' : ''
        }`}
      >
        Search
      </button>
      {canExport ? (
        <a
          href="/api/export/car-hire?report=clients"
          className="rounded-full border border-outline-variant bg-white px-5 py-2.5 text-sm font-medium shadow-sm hover:border-primary hover:text-primary dark:border-[#1e3a5f] dark:bg-[#0c1c38] dark:text-blue-100"
        >
          Export CSV
        </a>
      ) : null}
    </div>
  )
}

export default function ClientLiveSearch({ canExport = false }: Props) {
  const titleId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const [results, setResults] = useState<ClientLookupRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [mounted, setMounted] = useState(false)
  const requestId = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setHint(null)
      }
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const runLookup = useCallback(async (raw: string) => {
    const q = raw.trim()
    setOpen(true)

    if (q.length < 2) {
      setHint('Type at least 2 characters, then click Search.')
      setResults([])
      setError(null)
      setLoading(false)
      setSearched(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const id = ++requestId.current

    setHint(null)
    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const res = await fetch(`/api/admin/clients/lookup?q=${encodeURIComponent(q)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (id !== requestId.current) return
      const data = (await res.json()) as {
        ok?: boolean
        clients?: ClientLookupRow[]
        message?: string
      }
      if (!res.ok || !data.ok) {
        setResults([])
        setError(data.message || 'Search failed.')
        return
      }
      setResults(data.clients ?? [])
    } catch (err) {
      if (controller.signal.aborted || id !== requestId.current) return
      setResults([])
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  function closeModal() {
    abortRef.current?.abort()
    setOpen(false)
    setHint(null)
  }

  function onSearchClick() {
    void runLookup(query)
  }

  const trimmed = query.trim()
  const showEmpty = searched && !loading && !error && !hint && results.length === 0

  return (
    <>
      {!open ? (
        <div className="relative z-10 flex flex-wrap items-end gap-3">
          <SearchControls
            query={query}
            canExport={canExport}
            onChange={setQuery}
            onSearch={onSearchClick}
          />
        </div>
      ) : (
        <div className="h-[2.75rem]" aria-hidden />
      )}

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex flex-col">
              <button
                type="button"
                aria-label="Close search"
                className={`absolute inset-0 cursor-default border-0 bg-[#041530]/45 backdrop-blur-[10px] transition-opacity duration-300 dark:bg-[#020a18]/70 ${
                  entered ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={closeModal}
              />

              <div
                className={`relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-8 ${
                  entered ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              >
                <div
                  className={`rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-[0_16px_40px_rgba(4,21,48,0.18)] backdrop-blur-xl transition-all duration-300 dark:border-[#2a4a78]/50 dark:bg-[#0a1628]/90 ${
                    entered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                  }`}
                >
                  <SearchControls
                    query={query}
                    canExport={false}
                    onChange={setQuery}
                    onSearch={onSearchClick}
                  />
                </div>

                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-gradient-to-b from-white via-[#f8fafd] to-[#eef3fa] shadow-[0_40px_100px_rgba(4,21,48,0.35)] transition-all duration-300 ease-out dark:border-[#2a4a78]/55 dark:from-[#0d1c36] dark:via-[#0a1628] dark:to-[#07101f] ${
                    entered
                      ? 'translate-y-0 scale-100 opacity-100'
                      : 'translate-y-5 scale-[0.97] opacity-0'
                  }`}
                  style={{ maxHeight: 'min(36rem, calc(100vh - 9rem))' }}
                >
                  <div className="relative shrink-0 border-b border-[#d8e2f0]/90 px-5 py-4 sm:px-7 sm:py-5 dark:border-[#1e3a5f]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/70 to-transparent"
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p
                          id={titleId}
                          className="text-lg font-semibold tracking-tight text-[#0a1a33] dark:text-blue-50 sm:text-xl"
                        >
                          Search results
                        </p>
                        <p className="mt-1 truncate text-sm text-[#5a6b82] dark:text-blue-200/45">
                          {hint
                            ? hint
                            : loading
                              ? 'Searching…'
                              : searched
                                ? `${results.length} match${results.length === 1 ? '' : 'es'} for “${trimmed}”`
                                : 'Search by name, phone, ID, or licence'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        aria-label="Close"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#E90809] to-[#9f0000] text-white shadow-[0_10px_24px_rgba(233,8,9,0.4)] transition hover:opacity-95 active:scale-95"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {hint ? (
                      <p className="px-6 py-14 text-center text-sm text-[#5a6b82] dark:text-blue-200/45">{hint}</p>
                    ) : error ? (
                      <p className="px-6 py-14 text-center text-sm text-error">{error}</p>
                    ) : loading ? (
                      <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-[#5a6b82] dark:text-blue-200/45">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                        Looking up clients…
                      </div>
                    ) : showEmpty ? (
                      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                        <span className="material-symbols-outlined text-[36px] text-on-surface-variant/50">
                          person_search
                        </span>
                        <p className="text-sm font-semibold text-[#0a1a33] dark:text-blue-50">
                          No client found
                        </p>
                        <p className="max-w-sm text-sm text-[#5a6b82] dark:text-blue-200/45">
                          Nothing matches “{trimmed}”. Check the name, phone, ID, or licence — or register them with{' '}
                          <strong className="font-semibold text-on-surface dark:text-blue-100">New Client</strong>.
                        </p>
                      </div>
                    ) : results.length === 0 ? (
                      <p className="px-6 py-14 text-center text-sm text-[#5a6b82] dark:text-blue-200/45">
                        Enter a name, phone, National ID, or licence, then click Search.
                      </p>
                    ) : (
                      <ul>
                        {results.map((client, index) => (
                          <li
                            key={client.id}
                            className={`flex flex-wrap items-center gap-3 px-5 py-4 sm:px-7 ${
                              index > 0 ? 'border-t border-[#e4ebf5] dark:border-[#1e3a5f]/70' : ''
                            } hover:bg-[#0C5CF0]/[0.04] dark:hover:bg-primary/10`}
                          >
                            <div
                              aria-hidden
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B8BFF] via-[#0C5CF0] to-[#043BA9] text-[11px] font-bold tracking-wide text-white shadow-[0_8px_18px_rgba(12,92,240,0.28)]"
                            >
                              {initials(client.fullName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold tracking-tight text-[#0a1a33] dark:text-blue-50">
                                {client.fullName}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[#5a6b82] dark:text-blue-200/50 sm:text-sm">
                                {client.phone}
                                {client.email ? ` · ${client.email}` : ''}
                                {client.trips > 0
                                  ? ` · ${client.trips} trip${client.trips === 1 ? '' : 's'}`
                                  : ''}
                              </p>
                            </div>
                            <StatusPill status={client.status === 'ACTIVE' ? 'Active' : 'Suspended'} />
                            {client.status === 'ACTIVE' ? (
                              <a
                                href={`/admin/bookings?clientId=${client.id}`}
                                title="Booking — create a hire for this client"
                                aria-label="Booking — create a hire for this client"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#E90809] transition hover:bg-[#E90809]/10"
                              >
                                <span className="material-symbols-outlined text-[20px]">event_available</span>
                              </a>
                            ) : null}
                            <ClientViewButton client={{ ...client, loyaltyPoints: 0 }} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
