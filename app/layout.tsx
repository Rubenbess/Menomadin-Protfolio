import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Menomadin Portfolio',
  description: 'Menomadin Group — Portfolio Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Menomadin',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6366f1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/menomadin-icon.svg" />
      </head>
      <body>{children}</body>
    </html>
  )
}
