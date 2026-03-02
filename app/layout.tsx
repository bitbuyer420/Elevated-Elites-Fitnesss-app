import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Barlow_Condensed, Barlow } from 'next/font/google'
import './globals.css'

// ── Fonts ──────────────────────────────────────────────────
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

const barlow = Barlow({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Elevated Elites — Train Without Limits',
  description: 'Elite fitness tracking for those who demand excellence.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Elevated Elites',
  },
}

export const viewport: Viewport = {
  themeColor: '#CC0000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${barlowCondensed.variable} ${barlow.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
