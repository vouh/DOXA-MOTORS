'use client'

import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  assignVehicleToOwner,
  updateCarOwner,
} from '@/app/actions/owners'
import { StatusPill } from '@/components/admin/ui'
import OwnerPayoutsTab from '@/components/admin/OwnerPayoutsTab'

export type OwnerVehicleRow = {
  id: string
  regNumber: string
  make: string
  model: string
  type: string
  status: string
  dailyRate: number
}

export type FleetVehicleOption = {
  id: string
  regNumber: string
  make: string
  model: string
  ownerId: string
  ownerName: string
}

export type OwnerDetails = {
  id: string
  fullName: string
  phone: string
  email: string | null
  nationalId: string
  kraPin: string | null
  bankDetails: string | null
  mpesaNumber: string | null
  nextOfKin: string | null
  commissionType: 'PERCENTAGE' | 'FIXED'
  commissionValue: number
  recurringDeduction: number
  active: boolean
  vehicles: OwnerVehicleRow[]
  latestPayoutNet: number
  latestPayoutStatus: string | null
  totalEarned: number
  doxaShare: number
  ownerShare: number
}

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628] dark:text-blue-50'
const labelCls =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-blue-200/45'

const TYPE_LABEL: Record<string, string> = {
  SALOON: 'Saloon',
  SUV_4X4: 'SUV / 4x4',
  VAN_MINIBUS: 'Van / minibus',
  PICKUP: 'Pickup',
  ECONOMY: 'Economy',
}

export default function OwnerViewButton({
  owner,
  fleetVehicles,
  canEdit,
  canAssign,
  canPayout,
}: {
  owner: OwnerDetails
  fleetVehicles: FleetVehicleOption[]
  canEdit: boolean
  canAssign: boolean
  canPayout: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'details' | 'fleet' | 'payouts'>('details')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [linkVehicleId, setLinkVehicleId] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, pending])

  const linkOptions = useMemo(
    () => fleetVehicles.filter((v) => v.ownerId !== owner.id),
    [fleetVehicles, owner.id],
  )

  function run(action: () => Promise<{ ok: boolean; message: string }>, refreshAfter = true) {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message)
      if (refreshAfter) {
        window.setTimeout(() => router.refresh(), 400)
      }
    })
  }

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
            <button
              type="button"
              aria-label="Close dialog"
              disabled={pending}
              className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm disabled:cursor-not-allowed dark:bg-black/60"
              onClick={() => {
                if (!pending) setOpen(false)
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-[0_20px_48px_rgba(4,59,169,0.2)] dark:border-[#1e3a5f] dark:bg-[#0c1c38]"
            >
              <div className="flex items-start justify-between gap-2 border-b border-outline-variant px-4 py-3 dark:border-[#1e3a5f]">
                <div className="min-w-0">
                  <h2
                    id={titleId}
                    className="truncate text-[15px] font-bold tracking-tight text-[#1D2235] dark:text-blue-50"
                  >
                    {owner.fullName}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">
                    {owner.nationalId} · {owner.phone}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={owner.active ? 'ACTIVE' : 'INACTIVE'} />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809]"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-1 border-b border-outline-variant px-3 pt-2 dark:border-[#1e3a5f]">
                {(
                  [
                    ['details', 'Details'],
                    ['fleet', `Fleet (${owner.vehicles.length})`],
                    ['payouts', 'Payouts'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTab(key)
                      setMessage(null)
                      setError(null)
                    }}
                    className={`rounded-t-md px-3 py-1.5 text-[12px] font-semibold transition ${
                      tab === key
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="thin-theme-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {tab === 'details' ? (
                  <form
                    className="grid gap-2.5 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!canEdit || pending) return
                      const data = new FormData(e.currentTarget)
                      data.set('id', owner.id)
                      run(() => updateCarOwner(data))
                    }}
                  >
                    <input type="hidden" name="id" value={owner.id} />

                    <div className="grid gap-2 rounded-lg border border-outline-variant bg-surface-container-low/50 p-3 sm:col-span-2 dark:border-[#1e3a5f] dark:bg-white/5 sm:grid-cols-3">
                      <div>
                        <p className={labelCls}>Total earned</p>
                        <p className="text-[15px] font-bold tabular-nums text-[#1D2235] dark:text-blue-50">
                          KES {owner.totalEarned.toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-[10px] text-on-surface-variant">
                          Paid bookings on their cars
                        </p>
                      </div>
                      <div>
                        <p className={labelCls}>Doxa share</p>
                        <p className="text-[15px] font-bold tabular-nums text-on-surface-variant">
                          KES {owner.doxaShare.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className={labelCls}>Owner share</p>
                        <p className="text-[15px] font-bold tabular-nums text-primary">
                          KES {owner.ownerShare.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <label className="sm:col-span-2">
                      <span className={labelCls}>Full name *</span>
                      <input
                        className={field}
                        name="fullName"
                        defaultValue={owner.fullName}
                        required
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>Phone *</span>
                      <input
                        className={field}
                        name="phone"
                        defaultValue={owner.phone}
                        required
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>Email</span>
                      <input
                        className={field}
                        name="email"
                        type="email"
                        defaultValue={owner.email || ''}
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>National ID *</span>
                      <input
                        className={field}
                        name="nationalId"
                        defaultValue={owner.nationalId}
                        required
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>KRA PIN</span>
                      <input
                        className={field}
                        name="kraPin"
                        defaultValue={owner.kraPin || ''}
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>M-Pesa</span>
                      <input
                        className={field}
                        name="mpesaNumber"
                        defaultValue={owner.mpesaNumber || ''}
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>Next of kin</span>
                      <input
                        className={field}
                        name="nextOfKin"
                        defaultValue={owner.nextOfKin || ''}
                        readOnly={!canEdit}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className={labelCls}>Bank details</span>
                      <input
                        className={field}
                        name="bankDetails"
                        defaultValue={owner.bankDetails || ''}
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>Doxa share type</span>
                      <select
                        className={field}
                        name="commissionType"
                        defaultValue={owner.commissionType}
                        disabled={!canEdit}
                      >
                        <option value="PERCENTAGE">Percentage of hire</option>
                        <option value="FIXED">Fixed (KES)</option>
                      </select>
                    </label>
                    <label>
                      <span className={labelCls}>Doxa share *</span>
                      <input
                        className={field}
                        name="commissionValue"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={owner.commissionValue}
                        required
                        readOnly={!canEdit}
                      />
                    </label>
                    <label>
                      <span className={labelCls}>Recurring deduction</span>
                      <input
                        className={field}
                        name="recurringDeduction"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={owner.recurringDeduction}
                        readOnly={!canEdit}
                      />
                    </label>
                    {canEdit ? (
                      <label>
                        <span className={labelCls}>Status</span>
                        <select
                          className={field}
                          name="active"
                          defaultValue={owner.active ? 'true' : 'false'}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </label>
                    ) : null}

                    <p className="sm:col-span-2 text-[11px] text-on-surface-variant">
                      Logbook and signed agreement live on the{' '}
                      <a href="/admin/documents" className="font-semibold text-primary hover:underline">
                        Documents
                      </a>{' '}
                      page — link them to this owner.
                    </p>

                    <div className="sm:col-span-2 rounded-lg border border-outline-variant/70 bg-surface-container-low/40 px-3 py-2 text-[12px] text-on-surface-variant">
                      Latest payout:{' '}
                      <span className="font-semibold text-on-surface">
                        KES {owner.latestPayoutNet.toLocaleString()}
                      </span>
                      {owner.latestPayoutStatus ? ` · ${owner.latestPayoutStatus}` : ' · No statement'}
                      {' — '}
                      <button
                        type="button"
                        className="font-semibold text-primary hover:underline"
                        onClick={() => {
                          setTab('payouts')
                          setMessage(null)
                          setError(null)
                        }}
                      >
                        Open Payouts
                      </button>
                    </div>

                    {canEdit ? (
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={pending}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
                        >
                          {pending ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    ) : null}
                  </form>
                ) : tab === 'fleet' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        Linked vehicles
                      </p>
                      {owner.vehicles.length ? (
                        <ul className="mt-2 divide-y divide-outline-variant/70 rounded-lg border border-outline-variant">
                          {owner.vehicles.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]"
                            >
                              <div>
                                <p className="font-semibold text-on-surface">
                                  {v.regNumber}{' '}
                                  <span className="font-normal text-on-surface-variant">
                                    · {v.make} {v.model} · {TYPE_LABEL[v.type] ?? v.type}
                                  </span>
                                </p>
                                <p className="text-[11px] text-on-surface-variant">
                                  KES {v.dailyRate.toLocaleString()}/day
                                </p>
                              </div>
                              <StatusPill status={v.status} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 rounded-lg border border-dashed border-outline-variant px-3 py-4 text-center text-[12px] text-on-surface-variant">
                          No vehicles linked yet.
                        </p>
                      )}
                    </div>

                    {canAssign ? (
                      <div className="rounded-lg border border-outline-variant bg-surface-container-low/30 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                          Link a fleet car
                        </p>
                        <p className="mt-1 text-[11px] text-on-surface-variant">
                          Assign an existing vehicle to this owner. Commission and payouts follow the
                          owner on the car.
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <select
                            className={`${field} flex-1`}
                            value={linkVehicleId}
                            onChange={(e) => setLinkVehicleId(e.target.value)}
                          >
                            <option value="">Select vehicle…</option>
                            {linkOptions.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.regNumber} · {v.make} {v.model} (now: {v.ownerName})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={pending || !linkVehicleId}
                            onClick={() => {
                              if (!linkVehicleId) return
                              run(async () => {
                                const result = await assignVehicleToOwner(linkVehicleId, owner.id)
                                if (result.ok) setLinkVehicleId('')
                                return result
                              })
                            }}
                            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-[#E90809] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-[16px]">link</span>
                            {pending ? 'Linking…' : 'Link'}
                          </button>
                        </div>
                        {!linkOptions.length ? (
                          <p className="mt-2 text-[11px] text-on-surface-variant">
                            Every vehicle in the fleet is already linked to this owner — or no
                            vehicles exist yet.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <OwnerPayoutsTab
                    ownerId={owner.id}
                    canPayout={canPayout}
                    pending={pending}
                    onRun={run}
                  />
                )}

                {message ? (
                  <p className="mt-3 rounded-md border border-green-500/30 bg-green-50 px-2.5 py-1.5 text-xs text-green-800">
                    {message}
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 rounded-md border border-error/30 bg-error-container/50 px-2.5 py-1.5 text-xs text-on-error-container">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTab('details')
          setMessage(null)
          setError(null)
          setOpen(true)
        }}
        title="View owner"
        aria-label={`View ${owner.fullName}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-primary transition hover:bg-primary/5"
      >
        <span className="material-symbols-outlined text-[18px]">visibility</span>
      </button>
      {modal}
    </>
  )
}
