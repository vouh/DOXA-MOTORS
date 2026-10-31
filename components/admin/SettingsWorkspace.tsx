'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  previewLoyaltyPointsAction,
  saveCategoryPricesAction,
  saveLoyaltyConfigAction,
} from '@/app/actions/settings'
import {
  VEHICLE_TYPES,
  type CategoryStartingPrices,
  type LoyaltyConfig,
} from '@/lib/loyalty/defaults'

const field =
  'w-full rounded-md border border-outline-variant bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-[#1e3a5f] dark:bg-[#0a1628]'
const label =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant'

type ModalKind = 'prices' | 'loyalty' | 'preview' | null

function SettingsModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#071428]/55 backdrop-blur-sm dark:bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_24px_64px_rgba(4,59,169,0.22)] dark:border-[#1e3a5f] dark:bg-[#0c1c38] ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant px-5 py-4 dark:border-[#1e3a5f]">
          <div>
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-[#1D2235] dark:text-blue-50">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-on-surface-variant dark:text-blue-200/50">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-error/10 hover:text-[#E90809]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="thin-theme-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function SummaryCard({
  title,
  description,
  children,
  action,
}: {
  title: string
  description: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-4 dark:border-[#1e3a5f] dark:bg-[#0c1c38]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          <p className="mt-0.5 text-[12px] text-on-surface-variant">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export default function SettingsWorkspace({
  canEdit,
  initialPrices,
  initialLoyalty,
}: {
  canEdit: boolean
  initialPrices: CategoryStartingPrices
  initialLoyalty: LoyaltyConfig
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [modal, setModal] = useState<ModalKind>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewPts, setPreviewPts] = useState<number | null>(null)
  const [prices, setPrices] = useState(initialPrices)
  const [loyalty, setLoyalty] = useState(initialLoyalty)

  useEffect(() => {
    setPrices(initialPrices)
    setLoyalty(initialLoyalty)
  }, [initialPrices, initialLoyalty])

  function closeModal() {
    if (pending) return
    setModal(null)
    setError(null)
  }

  const btn =
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#E90809] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#C50000] disabled:opacity-50'
  const btnGhost =
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-[12px] font-semibold text-on-surface transition hover:border-primary hover:text-primary dark:border-[#1e3a5f]'

  return (
    <div className="space-y-4">
      {notice ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard
          title="Category starting prices"
          description="Defaults when adding a vehicle (KES / day)."
          action={
            canEdit ? (
              <button type="button" className={btn} onClick={() => setModal('prices')}>
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit prices
              </button>
            ) : null
          }
        >
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VEHICLE_TYPES.map((t) => (
              <li
                key={t}
                className="rounded-lg border border-outline-variant/70 px-2.5 py-2 dark:border-[#1e3a5f]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t.replace(/_/g, ' ')}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  KES {prices[t].toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </SummaryCard>

        <SummaryCard
          title="Loyalty program"
          description={
            loyalty.enabled
              ? `On · redeem from ${loyalty.minPointsToRedeem} pts · max ${loyalty.maxDiscountPercentOfHire}% off`
              : 'Currently disabled'
          }
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => setModal('preview')}>
                <span className="material-symbols-outlined text-[16px]">calculate</span>
                Preview points
              </button>
              {canEdit ? (
                <button type="button" className={btn} onClick={() => setModal('loyalty')}>
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit loyalty
                </button>
              ) : null}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] uppercase text-on-surface-variant">
                <tr>
                  <th className="py-1 pr-2">Category</th>
                  <th className="py-1 pr-2">Base</th>
                  <th className="py-1">Pts / day</th>
                </tr>
              </thead>
              <tbody>
                {VEHICLE_TYPES.map((t) => (
                  <tr key={t} className="border-t border-outline-variant/60">
                    <td className="py-1.5 pr-2 font-medium">{t.replace(/_/g, ' ')}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{loyalty.category[t].basePoints}</td>
                    <td className="py-1.5 tabular-nums">{loyalty.category[t].pointsPerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Earn: KES {loyalty.kesPerPointEarn}/pt · Redeem: KES {loyalty.kesPerPointRedeem}/pt
          </p>
        </SummaryCard>
      </div>

      <SettingsModal
        open={modal === 'prices'}
        title="Category starting prices"
        subtitle="Defaults when adding a vehicle. Staff can still override the rate on the vehicle form."
        onClose={closeModal}
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canEdit) return
            const data = new FormData(e.currentTarget)
            setNotice(null)
            setError(null)
            start(async () => {
              const r = await saveCategoryPricesAction(data)
              if (!r.ok) {
                setError(r.message)
                return
              }
              const next = { ...prices }
              for (const t of VEHICLE_TYPES) {
                next[t] = Number(data.get(t) || next[t])
              }
              setPrices(next)
              setNotice(r.message)
              setModal(null)
              router.refresh()
            })
          }}
        >
          {VEHICLE_TYPES.map((t) => (
            <label key={t}>
              <span className={label}>{t.replace(/_/g, ' ')}</span>
              <input
                className={field}
                name={t}
                type="number"
                min="0"
                step="1"
                defaultValue={prices[t]}
                disabled={!canEdit || pending}
                required
              />
            </label>
          ))}
          {error ? <p className="text-sm text-[#E90809] sm:col-span-2">{error}</p> : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={closeModal} className={btnGhost} disabled={pending}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={btn}>
              {pending ? 'Saving…' : 'Save prices'}
            </button>
          </div>
        </form>
      </SettingsModal>

      <SettingsModal
        open={modal === 'loyalty'}
        title="Loyalty earn & redeem"
        subtitle="Awarded when hire is returned, balance is 0, and client is active."
        onClose={closeModal}
        wide
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canEdit) return
            const data = new FormData(e.currentTarget)
            data.set('enabled', data.get('enabled') === 'on' ? 'true' : 'false')
            setNotice(null)
            setError(null)
            start(async () => {
              const r = await saveLoyaltyConfigAction(data)
              if (!r.ok) {
                setError(r.message)
                return
              }
              setNotice(r.message)
              setModal(null)
              router.refresh()
            })
          }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={loyalty.enabled}
              disabled={!canEdit || pending}
            />
            Loyalty program enabled
          </label>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] uppercase text-on-surface-variant">
                <tr>
                  <th className="py-1 pr-2">Category</th>
                  <th className="py-1 pr-2">Base pts</th>
                  <th className="py-1">Pts / day</th>
                </tr>
              </thead>
              <tbody>
                {VEHICLE_TYPES.map((t) => (
                  <tr key={t} className="border-t border-outline-variant/60">
                    <td className="py-2 pr-2 font-medium">{t.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-2">
                      <input
                        className={field}
                        name={`${t}_base`}
                        type="number"
                        min="0"
                        defaultValue={loyalty.category[t].basePoints}
                        disabled={!canEdit || pending}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        className={field}
                        name={`${t}_day`}
                        type="number"
                        min="0"
                        defaultValue={loyalty.category[t].pointsPerDay}
                        disabled={!canEdit || pending}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={label}>KES per earn point</span>
              <input
                className={field}
                name="kesPerPointEarn"
                type="number"
                min="1"
                defaultValue={loyalty.kesPerPointEarn}
                disabled={!canEdit || pending}
              />
            </label>
            <label>
              <span className={label}>KES per redeem point</span>
              <input
                className={field}
                name="kesPerPointRedeem"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={loyalty.kesPerPointRedeem}
                disabled={!canEdit || pending}
              />
            </label>
            <label>
              <span className={label}>Min points to redeem</span>
              <input
                className={field}
                name="minPointsToRedeem"
                type="number"
                min="0"
                defaultValue={loyalty.minPointsToRedeem}
                disabled={!canEdit || pending}
              />
            </label>
            <label>
              <span className={label}>Max discount % of hire</span>
              <input
                className={field}
                name="maxDiscountPercentOfHire"
                type="number"
                min="0"
                max="100"
                defaultValue={loyalty.maxDiscountPercentOfHire}
                disabled={!canEdit || pending}
              />
            </label>
          </div>

          <div>
            <p className={label}>Condition rating bonus points (1–5)</p>
            <div className="mt-1 grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((r) => (
                <label key={r}>
                  <span className="text-[10px] text-on-surface-variant">R{r}</span>
                  <input
                    className={field}
                    name={`bonus_${r}`}
                    type="number"
                    min="0"
                    defaultValue={loyalty.conditionBonusPoints[r - 1]}
                    disabled={!canEdit || pending}
                  />
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-[#E90809]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className={btnGhost} disabled={pending}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={btn}>
              {pending ? 'Saving…' : 'Save loyalty'}
            </button>
          </div>
        </form>
      </SettingsModal>

      <SettingsModal
        open={modal === 'preview'}
        title="Points preview"
        subtitle="Estimate points from current loyalty settings."
        onClose={closeModal}
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            setPreviewPts(null)
            setError(null)
            start(async () => {
              const r = await previewLoyaltyPointsAction(data)
              if (!r.ok) setError(r.message)
              else setPreviewPts(r.points ?? null)
            })
          }}
        >
          <label>
            <span className={label}>Category</span>
            <select className={field} name="vehicleType" defaultValue="SALOON">
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Days</span>
            <input className={field} name="hireDays" type="number" min="1" defaultValue={3} required />
          </label>
          <label>
            <span className={label}>Hire amount (KES)</span>
            <input
              className={field}
              name="hireAmountKes"
              type="number"
              min="0"
              defaultValue={15000}
              required
            />
          </label>
          <label>
            <span className={label}>Rating</span>
            <select className={field} name="conditionRating" defaultValue="5">
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-[#E90809] sm:col-span-2">{error}</p> : null}
          {previewPts != null ? (
            <p className="sm:col-span-2 rounded-lg border border-green-500/30 bg-green-50 px-3 py-2 text-sm font-semibold tabular-nums text-green-800 dark:bg-green-900/20 dark:text-green-300">
              {previewPts} points
            </p>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={closeModal} className={btnGhost} disabled={pending}>
              Close
            </button>
            <button type="submit" disabled={pending} className={btn}>
              {pending ? 'Calculating…' : 'Calculate'}
            </button>
          </div>
        </form>
      </SettingsModal>
    </div>
  )
}
