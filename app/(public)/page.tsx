import type { Metadata } from 'next'
import Link from 'next/link'
import HeroActions from '@/components/home/HeroActions'
import { HERO_IMAGE } from '@/lib/constants'

export const metadata: Metadata = {
  title: {
    absolute: 'Doxa Tours & Car Hire',
  },
}

export default function HomePage() {
  return (
    <main className="flex-grow">
      <section className="bg-primary text-on-primary py-xxl px-md md:px-lg relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("${HERO_IMAGE}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row items-center gap-xl relative z-10">
          <div className="w-full md:w-1/2 flex flex-col gap-lg">
            <h1 className="font-h1-mobile text-h1-mobile md:font-h1 md:text-h1 text-on-primary">
              Premium Vehicles. Reliable Service. Every Journey.
            </h1>
            <p className="font-body-lg text-body-lg text-on-primary/90 max-w-lg">
              Doxa Tours & Car Hire offers a modern fleet of well-maintained vehicles for personal travel, corporate transfers, airport pickups, and guided tours across Kenya.
            </p>
            <HeroActions />
          </div>
          <div className="w-full md:w-1/2 rounded-xl overflow-hidden shadow-sm">
            <img
              className="w-full h-auto object-cover aspect-video md:aspect-[4/3] rounded-xl border border-outline-variant/20"
              src={HERO_IMAGE}
              alt="Doxa Car Hire fleet"
            />
          </div>
        </div>
      </section>

      <section className="py-xxl px-md md:px-lg bg-surface-container-low">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-lg max-w-2xl mx-auto">
            <p className="font-label-bold text-label-bold text-secondary-container uppercase tracking-[0.14em] mb-xs">
              Why choose us
            </p>
            <h2 className="font-h2 text-h2-mobile md:text-h2 text-primary">Trusted. Flexible. Affordable.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <article className="mvv-card bg-white p-md md:p-lg rounded-2xl border border-primary/10 flex flex-col text-left group">
              <h3 className="mvv-title font-h3 text-[20px] leading-snug text-primary mb-sm">Wide Fleet</h3>
              <span className="mvv-rule block w-8 h-0.5 bg-primary mb-md" aria-hidden="true" />
              <p className="mvv-body font-body-md text-[15px] leading-relaxed text-on-surface">
                From saloons and SUVs to minibuses and luxury vehicles — we have the right car for every occasion, group size, and budget.
              </p>
            </article>
            <article className="mvv-card bg-primary p-md md:p-lg rounded-2xl border border-transparent flex flex-col text-left group">
              <h3 className="mvv-title font-h3 text-[20px] leading-snug text-on-primary mb-sm">Expert Drivers</h3>
              <span className="mvv-rule block w-8 h-0.5 bg-secondary-container mb-md" aria-hidden="true" />
              <p className="mvv-body font-body-md text-[15px] leading-relaxed text-on-primary/90">
                All our chauffeurs are vetted, licensed, and experienced. They know the routes, respect your time, and prioritise your safety.
              </p>
            </article>
            <article className="mvv-card bg-white p-md md:p-lg rounded-2xl border border-primary/10 flex flex-col text-left group">
              <h3 className="mvv-title font-h3 text-[20px] leading-snug text-primary mb-sm">24/7 Support</h3>
              <span className="mvv-rule block w-8 h-0.5 bg-primary mb-md" aria-hidden="true" />
              <p className="mvv-body font-body-md text-[15px] leading-relaxed text-on-surface">
                Our dispatch team is always reachable. Whether it's an early-morning airport run or a late-night city transfer, we've got you covered.
              </p>
            </article>
          </div>
          <p className="text-center mt-lg font-body-md text-[15px] text-on-surface-variant">
            Want to know more about us?{' '}
            <Link href="/about" className="text-secondary-container font-semibold hover:underline">
              Read our story
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  )
}
