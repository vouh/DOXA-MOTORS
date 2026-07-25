import type { Metadata } from 'next'
import { Montserrat, Inter, Orbitron } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: {
    default: 'Doxa Tours & Car Hire',
    template: '%s - Doxa Tours & Car Hire',
  },
  description:
    'Doxa Tours & Car Hire Services — premium fleet management and booking system.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body
        className={`${montserrat.variable} ${inter.variable} ${orbitron.variable} bg-background text-on-background font-body-md text-body-md antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  )
}
