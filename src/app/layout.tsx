import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hookscope — Webhook Inspector',
  description:
    'Hookscope is a developer workbench for webhooks: inspect deliveries in real time, simulate any response or failure, replay and diff retries, and verify provider signatures (Stripe, GitHub, Shopify, Svix, and more).',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Runs before first paint to set the theme class, preventing a flash of the
// wrong theme. Defaults to light; only goes dark if the user explicitly chose it.
const themeScript = `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('theme')==='dark');}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Toaster>
          {children}
        </Toaster>
      </body>
    </html>
  )
}
