import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Webhook Tester',
  description: 'A developer tool for testing webhook delivery, retry logic, and failure scenarios',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <Toaster>
          {children}
        </Toaster>
      </body>
    </html>
  )
}
