import { SITE_LOGO } from '@/lib/constants'

export default function BrandLogo({
  variant = 'sidebar',
  className = '',
}: {
  variant?: 'login' | 'sidebar' | 'compact'
  className?: string
}) {
  const frame = {
    login: 'h-[84px] w-[84px]',
    sidebar: 'h-12 w-12',
    compact: 'h-10 w-10',
  }[variant]

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-sm ring-1 ring-black/10 ${frame} ${className}`}>
      <img
        src={SITE_LOGO}
        alt="Doxa Motor Solutions"
        className="h-full w-full scale-125 object-contain"
      />
    </span>
  )
}
