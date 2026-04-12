import './globals.css'

export const metadata = { title: 'FII Pro' }

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  )
}
