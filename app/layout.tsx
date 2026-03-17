import type { Metadata } from "next"
import { AuthProvider } from "@/lib/auth-store"
import { ThemeProvider } from "@/lib/theme-provider"
import { BackgroundEffects } from "./components/BackgroundEffects"
import "./globals.css"

export const metadata: Metadata = {
  title: "Clever Service — Kurumsal AI Asistan",
  description: "E-ticaret ve kurumsal operasyonlar için AI destekli akıllı yönetim platformu",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#04040c" />
      </head>
      <body>
        <BackgroundEffects />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
