import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BEAUTY ROAD Dashboard',
  description: 'BEAUTY ROAD出演者情報管理ダッシュボード',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}