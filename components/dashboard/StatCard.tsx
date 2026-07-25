type Props = {
  label: string
  value: string
  hint?: string
  icon: string
  accent?: 'default' | 'orange' | 'green' | 'red'
}

const accents = {
  default: {
    border: 'border-outline-variant dark:border-[#1a2d4f]',
    icon: 'bg-primary-fixed/50 dark:bg-primary/30 text-primary dark:text-primary-fixed-dim',
    value: 'text-on-surface dark:text-blue-50',
    label: 'text-on-surface-variant dark:text-blue-200/60',
  },
  orange: {
    border: 'border-2 border-secondary-container/30',
    icon: 'bg-secondary-fixed/50 dark:bg-secondary/30 text-secondary dark:text-secondary-container',
    value: 'text-secondary dark:text-secondary-container',
    label: 'text-secondary dark:text-secondary-container font-bold',
  },
  green: {
    border: 'border-outline-variant dark:border-[#1a2d4f]',
    icon: 'bg-[#dcfce7] dark:bg-[#14532d]/40 text-[#166534] dark:text-[#4ade80]',
    value: 'text-on-surface dark:text-blue-50',
    label: 'text-on-surface-variant dark:text-blue-200/60',
  },
  red: {
    border: 'border-outline-variant dark:border-[#1a2d4f]',
    icon: 'bg-error-container dark:bg-error/20 text-on-error-container',
    value: 'text-on-surface dark:text-blue-50',
    label: 'text-on-surface-variant dark:text-blue-200/60',
  },
}

export default function StatCard({ label, value, hint, icon, accent = 'default' }: Props) {
  const a = accents[accent]
  return (
    <div
      className={`bg-surface-container-lowest dark:bg-[#0d1729] rounded-xl ${a.border} p-md flex flex-col gap-sm hover:shadow-[0_2px_12px_rgba(0,31,80,0.07)] transition-all duration-200 group relative overflow-hidden`}
    >
      {accent === 'orange' && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-secondary-container" />
      )}
      <div className="flex justify-between items-start">
        <p className={`font-caption text-[11px] uppercase tracking-wider ${a.label}`}>{label}</p>
        <div className={`${a.icon} p-1.5 rounded-lg`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {icon}
          </span>
        </div>
      </div>
      <p className={`font-h3 text-h3 mt-xs ${a.value}`}>{value}</p>
      {hint && (
        <p className="text-[11px] text-on-surface-variant dark:text-blue-200/50">{hint}</p>
      )}
    </div>
  )
}
