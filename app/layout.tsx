import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/components/ToastProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/menomadin-icon.svg" />
      </head>
      <body>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider />
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
