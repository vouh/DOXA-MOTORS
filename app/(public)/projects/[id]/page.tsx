import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublicProject } from '@/lib/data/queries'
import type { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const project = await getPublicProject(id)
  return { title: project ? `${project.title} — Alubonets` : 'Project' }
}

const STATUS_STYLES: Record<string, { label: string; classes: string; icon: string }> = {
  ONGOING:   { label: 'Ongoing',   classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',        icon: 'sync' },
  COMPLETED: { label: 'Completed', classes: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300',             icon: 'check_circle' },
  UPCOMING:  { label: 'Upcoming',  classes: 'bg-secondary-container/20 text-secondary-container dark:text-orange-400',     icon: 'upcoming' },
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const project = await getPublicProject(id)
  if (!project) notFound()

  const status = STATUS_STYLES[project.status] ?? STATUS_STYLES.UPCOMING

  return (
    <main className="flex-grow bg-surface-container-lowest">

      {/* Hero */}
      {project.imageUrl ? (
        <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
          <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-md md:px-lg pb-xl max-w-container-max mx-auto">
            <Link href="/projects" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-[13px] mb-4 transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              All projects
            </Link>
            <h1 className="font-h1-mobile text-h1-mobile md:font-h2 md:text-h2 text-white leading-tight max-w-3xl">
              {project.title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="relative bg-gradient-to-br from-primary to-[#001435] py-xxl px-md md:px-lg overflow-hidden">
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[160px] font-black text-white/[0.04] leading-none select-none pointer-events-none">P</span>
          <div className="max-w-container-max mx-auto relative">
            <Link href="/projects" className="inline-flex items-center gap-1.5 text-on-primary/60 hover:text-on-primary text-[13px] mb-6 transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              All projects
            </Link>
            <h1 className="font-h1-mobile text-h1-mobile md:font-h2 md:text-h2 text-on-primary leading-tight max-w-3xl">
              {project.title}
            </h1>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-container-max mx-auto px-md md:px-lg py-xl">
        <div className="grid md:grid-cols-3 gap-xl">

          {/* Main */}
          <div className="md:col-span-2 space-y-lg">
            {project.imageUrl && (
              <Link href="/projects" className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-[13px] transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                All projects
              </Link>
            )}
            <div className="space-y-4">
              {project.description.split('\n').map((p, i) => (
                <p key={i} className="text-[15px] text-on-surface-variant leading-relaxed">{p}</p>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside>
            <div className="rounded-2xl border border-outline-variant bg-surface p-5 space-y-4 shadow-sm sticky top-6">

              {/* Status */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold ${status.classes}`}>
                <span className="material-symbols-outlined icon-fill" style={{ fontSize: 15 }}>{status.icon}</span>
                {status.label}
              </div>

              <div className="space-y-3 pt-2 border-t border-outline-variant/40">
                {project.startDate && (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 18 }}>play_circle</span>
                    <div>
                      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Start date</p>
                      <p className="text-[14px] font-medium text-on-surface">
                        {new Date(project.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {project.endDate && (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary-container mt-0.5" style={{ fontSize: 18 }}>flag</span>
                    <div>
                      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">End date</p>
                      <p className="text-[14px] font-medium text-on-surface">
                        {new Date(project.endDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/projects"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-outline-variant bg-surface-container py-2.5 text-[13px] font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment</span>
                View all projects
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
