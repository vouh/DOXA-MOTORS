import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase.from('events').select('title').eq('id', id).eq('isPublic', true).single()
  return { title: data ? `${data.title} — Alubonets` : 'Event' }
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: event } = await supabase
    .from('events')
    .select('id, title, description, location, startsAt, endsAt, imageUrl, isPublic')
    .eq('id', id)
    .eq('isPublic', true)
    .single()

  if (!event) notFound()

  const date    = new Date(event.startsAt)
  const endDate = event.endsAt ? new Date(event.endsAt) : null
  const now     = new Date()
  const isPast  = date < now
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const monthShort = date.toLocaleDateString('en-KE', { month: 'short' }).toUpperCase()
  const monthLong  = date.toLocaleDateString('en-KE', { month: 'long' })
  const day        = date.getDate()
  const year       = date.getFullYear()
  const weekday    = date.toLocaleDateString('en-KE', { weekday: 'long' })
  const time       = date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  const endTime    = endDate?.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

  const countdownLabel = isPast ? null
    : daysUntil === 0 ? 'Today'
    : daysUntil === 1 ? 'Tomorrow'
    : `${daysUntil} days away`

  const paragraphs = event.description ? event.description.split('\n').filter(Boolean) : []

  return (
    <main className="flex-grow bg-surface-container-lowest">

      {/* ── HERO ── */}
      {event.imageUrl ? (
        /* Image hero */
        <div className="relative w-full h-[360px] md:h-[500px] overflow-hidden">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <div className="absolute top-0 inset-x-0 px-md md:px-lg pt-6 max-w-container-max mx-auto">
            <Link href="/events" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-[13px] font-medium transition-colors bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
              All events
            </Link>
          </div>
          <div className="absolute bottom-0 inset-x-0 px-md md:px-lg pb-10 max-w-container-max mx-auto">
            {isPast && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/10 backdrop-blur-sm text-white/70 border border-white/15 px-3 py-1 rounded-full mb-3">
                Past event
              </span>
            )}
            <h1 className="text-[28px] md:text-[42px] font-black text-white leading-tight max-w-3xl">{event.title}</h1>
          </div>
        </div>
      ) : (
        /* No-image: clean light header, no coloured background */
        <div className="border-b border-outline-variant/40 bg-surface">
          <div className="max-w-container-max mx-auto px-md md:px-lg pt-8 pb-10">
            <Link href="/events" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary text-[13px] font-medium transition-colors mb-8">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
              All events
            </Link>
            {isPast && (
              <div className="mb-3">
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest bg-outline/10 text-outline px-3 py-1 rounded-full">
                  Past event
                </span>
              </div>
            )}
            <h1 className="text-[30px] md:text-[44px] font-black text-on-surface leading-tight max-w-3xl">{event.title}</h1>
          </div>
        </div>
      )}

      {/* ── DETAILS ROW ── */}
      <div className="bg-surface border-b border-outline-variant/40">
        <div className="max-w-container-max mx-auto px-md md:px-lg py-6">
          <div className="flex flex-wrap gap-6 md:gap-10 items-center">

            {/* Date tile — only for image events (no-image hero already shows it) */}
            {event.imageUrl && (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-[9px] font-bold text-on-primary/60 uppercase tracking-[0.18em] leading-none">{monthShort}</span>
                    <span className="text-[28px] font-black text-on-primary leading-none">{day}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-on-surface">{weekday}</p>
                    <p className="text-[13px] text-on-surface-variant">{day} {monthLong} {year}</p>
                    {countdownLabel && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {countdownLabel}
                      </span>
                    )}
                    {isPast && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-outline/10 text-outline px-2 py-0.5 rounded-full">
                        Event passed
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden md:block h-10 w-px bg-outline-variant/50" />
              </>
            )}

            {/* Time */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>schedule</span>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Time</p>
                <p className="text-[14px] font-semibold text-on-surface">{time}{endTime ? ` – ${endTime}` : ''}</p>
              </div>
            </div>

            {event.location && (
              <>
                <div className="hidden md:block h-10 w-px bg-outline-variant/50" />
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary-container" style={{ fontSize: 22 }}>location_on</span>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Location</p>
                    <p className="text-[14px] font-semibold text-on-surface">{event.location}</p>
                  </div>
                </div>
              </>
            )}

            <div className="hidden md:block h-10 w-px bg-outline-variant/50" />

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: 22 }}>group</span>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Organised by</p>
                <p className="text-[14px] font-semibold text-on-surface">Alubonets SHG</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── DESCRIPTION ── */}
      <div className="max-w-container-max mx-auto px-md md:px-lg py-xl max-w-3xl">
        {paragraphs.length > 0 ? (
          <div className="space-y-5">
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="text-[16px] text-on-surface-variant leading-[1.85]">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-on-surface-variant/50 italic">No additional details provided for this event.</p>
        )}
      </div>
    </main>
  )
}
