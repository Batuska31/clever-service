"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // DEV MODE: Directly bypass auth and go to chat
    router.push("/chat")
  }, [router])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#07070f]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7828ff] border-t-transparent" />
    </div>
  )
}
