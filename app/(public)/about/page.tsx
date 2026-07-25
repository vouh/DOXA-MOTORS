import type { Metadata } from 'next'
import ValuesCarousel from '@/components/about/ValuesCarousel'
import { COMMITTEE_HEADSHOT, HERO_IMAGE } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'About',
}

const VALUES_TAGS = [
  'Reliability',
  'Professionalism',
  'Safety',
  'Affordability',
  'Customer Focus',
  'Integrity',
]

const TEAM = [
  { name: 'James M.', role: 'General Manager', alt: 'General Manager' },
  { name: 'Sarah K.', role: 'Operations Lead', alt: 'Operations Lead' },
  { name: 'David O.', role: 'Finance Officer', alt: 'Finance Officer' },
  { name: 'Mary N.', role: 'Dispatch Officer', alt: 'Dispatch Officer' },
  { name: 'Peter W.', role: 'Fleet Manager', alt: 'Fleet Manager' },
]

export default function AboutPage() {
  return (
    <main className="flex-grow">
      <section className="relative py-xxl px-lg overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, #F6F8FB 0%, #f0f2f8 45%, rgba(12,92,240,0.06) 100%)',
          }}
        />
        <div
          className="absolute -right-24 top-10 w-72 h-72 rounded-full pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(12,92,240,0.15) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-container-max mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-xl items-center">
            <div className="md:col-span-5 relative story-reveal">
              <div className="absolute -inset-3 rounded-2xl bg-primary/5 -rotate-2 pointer-events-none" />
              <div className="relative group rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(4,59,169,0.12)]">
                <img
                  alt="Doxa Car Hire fleet"
                  className="w-full h-[420px] object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  src={HERO_IMAGE}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-lg flex items-end justify-between gap-md">
                  <p className="font-label-bold text-label-bold text-white/95">On the road since 2015</p>
                  <div className="story-year-badge shrink-0 bg-secondary-container text-on-primary font-h3 text-h3 px-md py-sm rounded-lg shadow-lg">
                    2015
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-7 space-y-lg">
              <div className="story-reveal story-reveal-delay-1">
                <h2 className="font-h2 text-h2-mobile md:text-h2 text-primary mb-md">Our Story</h2>
                <div className="h-1 w-16 bg-secondary-container rounded-full story-accent-line mb-md" />
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Doxa Tours & Car Hire was founded in 2015 with a single mission: to make reliable, professional vehicle hire accessible to every Kenyan and visitor who needs it.
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-md">
                  Starting with a small fleet in Nairobi, we have grown steadily into a trusted name for airport transfers, corporate travel, safari tours, and long-distance hires throughout the country.
                </p>
              </div>
              <div className="story-reveal story-reveal-delay-2 relative pl-lg border-l-4 border-secondary-container bg-surface-container-lowest/80 rounded-r-xl py-lg pr-lg shadow-[0_8px_30px_rgba(4,59,169,0.06)]">
                <span
                  className="material-symbols-outlined text-secondary-container absolute -left-[18px] top-lg bg-surface rounded-full p-xs text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  directions_car
                </span>
                <h3 className="font-h3 text-h3 text-primary mb-sm">The Doxa Difference</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  <span className="font-semibold text-primary">Doxa</span> means glory — and we take that seriously. Every journey we handle reflects our commitment to punctuality, vehicle cleanliness, driver professionalism, and transparent pricing. We don't just drive you; we represent your journey.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-xxl px-lg max-w-container-max mx-auto">
        <div className="text-center mb-xl max-w-2xl mx-auto">
          <h2 className="font-h2 text-h2-mobile md:text-h2 text-primary mb-sm">Mission, Vision &amp; Values</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
          <div className="bg-surface-container-lowest rounded-2xl p-lg border border-primary/10 border-t-4 border-t-primary">
            <p className="font-label-bold text-label-bold text-primary uppercase tracking-[0.12em] text-[11px] mb-sm">
              Mission
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              To provide safe, comfortable, and affordable vehicle hire services that exceed client expectations through a well-maintained fleet, skilled drivers, and responsive customer support.
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-lg border border-primary/10 border-t-4 border-t-secondary-container">
            <p className="font-label-bold text-label-bold text-primary uppercase tracking-[0.12em] text-[11px] mb-sm">
              Vision
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              To be Kenya's most trusted car hire company — known for transparency, punctuality, and a premium experience at every price point.
            </p>
          </div>
        </div>
        <div>
          <p className="font-label-bold text-label-bold text-primary uppercase tracking-[0.12em] text-[11px] mb-md text-center">
            Core Values
          </p>
          <div className="flex flex-wrap justify-center gap-sm">
            {VALUES_TAGS.map(tag => (
              <span
                key={tag}
                className="px-md py-sm rounded-full bg-primary-fixed text-primary font-label-bold text-label-bold text-[13px]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-xxl px-lg overflow-hidden bg-primary">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.5px)',
            backgroundSize: '28px 28px',
            backgroundPosition: '14px 14px',
          }}
        />
        <div className="max-w-container-max mx-auto relative">
          <div className="text-center mb-xl max-w-2xl mx-auto story-reveal">
            <p className="font-label-bold text-label-bold text-secondary-container uppercase tracking-[0.14em] mb-sm">
              What guides us
            </p>
          </div>
          <ValuesCarousel />
        </div>
      </section>

      <section className="py-lg md:py-xl px-lg max-w-container-max mx-auto">
        <div className="text-center mb-lg max-w-2xl mx-auto">
          <h2 className="font-h2 text-h2-mobile md:text-h2 text-primary mb-sm">Our Team</h2>
          <p className="font-body-md text-[15px] leading-relaxed text-on-surface">
            Doxa Car Hire is run by a dedicated team committed to keeping every vehicle road-ready and every client satisfied.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-md md:gap-lg">
          {TEAM.map(member => (
            <div key={member.name} className="flex flex-col items-center w-36">
              <img
                alt={member.alt}
                className="w-28 h-28 rounded-full object-cover border border-primary/15 mb-sm"
                src={COMMITTEE_HEADSHOT}
              />
              <h4 className="font-label-bold text-[15px] text-primary text-center">{member.name}</h4>
              <span className="font-body-md text-[13px] text-primary/70 text-center mt-xs">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
