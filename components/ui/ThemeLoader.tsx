'use client'

/** Full-screen branded loader: solid navy + bouncing orange dots. */
export default function ThemeLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-2.5" aria-hidden>
          <span className="theme-loader-dot h-3 w-3 rounded-full bg-secondary-container" />
          <span className="theme-loader-dot theme-loader-dot-2 h-3 w-3 rounded-full bg-secondary-container" />
          <span className="theme-loader-dot theme-loader-dot-3 h-3 w-3 rounded-full bg-secondary-container" />
        </div>
        <p className="text-primary-fixed-dim/90 text-sm font-label-bold tracking-wide">{label}</p>
      </div>
    </div>
  )
}
