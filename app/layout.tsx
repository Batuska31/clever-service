import type { Metadata } from "next"
import { Manrope, Sora } from "next/font/google"
import { AuthProvider } from "@/lib/auth-store"
import { ThemeProvider } from "@/lib/theme-provider"
import { BackgroundEffects } from "./components/BackgroundEffects"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
})

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Clever Service - AI Command Studio",
  description: "Kurumsal operasyonlar icin tasarlanmis modern AI komut ve iletisim arayuzu.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${manrope.variable} ${sora.variable} dark`} data-theme="dark">
      <body>
        <BackgroundEffects />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
