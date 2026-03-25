import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Menomadin Portfolio',
  description: 'Menomadin Group — Portfolio Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
