import './globals.css'

export const metadata = {
  title: 'GTM Pipeline',
  description: 'Startup GTM outbound pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0a' }}>{children}</body>
    </html>
  )
}