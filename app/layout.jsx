import './globals.css'

export const metadata = { title: 'FII App Hardened' }

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  )
}
