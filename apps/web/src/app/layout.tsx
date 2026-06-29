import type { Metadata } from 'next'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc-provider'

export const metadata: Metadata = {
  title: 'OnTime — Time Tracking',
  description: 'Field workforce time tracking for construction',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  )
}
