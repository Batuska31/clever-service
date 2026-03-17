"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-store"
import { useTheme } from "@/lib/theme-provider"
import { AIThinking } from "../components/AIThinking"

type Role = "user" | "assistant"
type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "done" | "error"

type Msg = {
  id: string
  role: Role
  content: string
  typing?: boolean
  time?: string
}

type ChatSession = {
  id: string
  title: string
  lastMessage: string
  time: string
}

type IconName =
  | "plus"
  | "search"
  | "history"
  | "mic"
  | "spark"
  | "layers"
  | "team"
  | "calendar"
  | "wave"
  | "send"
  | "copy"
  | "sun"
  | "moon"
  | "logout"
  | "menu"
  | "arrow-right"
  | "chart"
  | "close"
  | "badge"
  | "planet"

type FeatureCard = {
  icon: IconName
  kicker: string
  title: string
  body: string
  prompt: string
  tone: "amber" | "sky" | "indigo"
}

type InsightMetric = {
  label: string
  value: string
  detail: string
}

type ActionChip = {
  label: string
  prompt: string
  icon: IconName
}

type SpeechRecognitionChunk = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: SpeechRecognitionChunk
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorLike = {
  error: string
}

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition

type VoiceWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionCtor
  webkitSpeechRecognition?: BrowserSpeechRecognitionCtor
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: "layers",
    kicker: "Workflow Canvas",
    title: "Ekip akışlarını, geri bildirimleri ve görevleri tek panelde topla.",
    body: "AI istekleri başlıklandırır, önceliklendirir ve net bir aksiyon planına dönüştürür.",
    prompt: "Bu haftanın ekip aksiyon planını üç öncelikli başlıkla çıkar.",
    tone: "amber",
  },
  {
    icon: "team",
    kicker: "Alignment Pulse",
    title: "Satış, operasyon ve pazarlama verilerini ortak bağlamda birleştir.",
    body: "Farklı ekiplerden gelen girdiler tek cevapta birleşir ve tekrar eden açıklama yükü azalır.",
    prompt: "Satış ve operasyon ekipleri için ortak bir günlük durum özeti hazırla.",
    tone: "sky",
  },
  {
    icon: "calendar",
    kicker: "Priority Engine",
    title: "Gününü akıllı bloklara ayır, kritik işleri önce yüzeye çıkar.",
    body: "Zaman planı, risk işaretleri ve hızlı kazanımlar aynı çalışma alanında görünür olur.",
    prompt: "Bugün için odaklanmam gereken en kritik üç işi sırala.",
    tone: "indigo",
  },
]

const INSIGHT_METRICS: InsightMetric[] = [
  {
    label: "Aktif otomasyon",
    value: "12 akış",
    detail: "Sipariş, stok ve CRM hareketleri senkron ilerliyor.",
  },
  {
    label: "Bugünkü cevap ritmi",
    value: "1.2 sn",
    detail: "Kısa özetler ve yönlendirmeler canlı akışta tutuluyor.",
  },
  {
    label: "Odak modu",
    value: "Canlı",
    detail: "Sesli komut, hızlı kartlar ve görev özetleri aynı yerden çalışıyor.",
  },
]

const QUICK_ACTIONS: ActionChip[] = [
  {
    label: "Sprint planı",
    prompt: "Bu hafta için sprint planı çıkar ve ekip rolleriyle özetle.",
    icon: "spark",
  },
  {
    label: "Stok radarı",
    prompt: "Kritik stok risklerini ve önerilen aksiyonları listele.",
    icon: "chart",
  },
  {
    label: "Toplantı brifi",
    prompt: "Akşam toplantısı için 5 maddelik kısa briefing hazırla.",
    icon: "badge",
  },
  {
    label: "Sesli özet",
    prompt: "Bugünkü operasyonu yöneticinin dinleyebileceği kısa bir sesli özet formatında hazırla.",
    icon: "wave",
  },
]

const RAIL_ACTIONS: Array<{ id: string; label: string; icon: IconName }> = [
  { id: "new", label: "Yeni sohbet", icon: "plus" },
  { id: "search", label: "Arama", icon: "search" },
  { id: "voice", label: "Sesli stüdyo", icon: "mic" },
  { id: "history", label: "Geçmiş", icon: "history" },
]

const MOCK_HISTORY: ChatSession[] = [
  {
    id: "session-1",
    title: "Satış ivmesi analizi",
    lastMessage: "Kampanya sonrası dönüşüm oranı yükseliyor.",
    time: "Bugün",
  },
  {
    id: "session-2",
    title: "Stok uyarıları",
    lastMessage: "Beş ürün için kritik eşik yaklaşıyor.",
    time: "Dün",
  },
  {
    id: "session-3",
    title: "Toplantı notları",
    lastMessage: "Yönetici özeti ve aksiyon listesi hazır.",
    time: "2 gün önce",
  },
]

const VOICE_COPY: Record<VoiceState, { title: string; detail: string }> = {
  idle: {
    title: "Hazır",
    detail: "Mikrofona dokun, doğal dilde konuş ve isteğini hızlıca işle.",
  },
  listening: {
    title: "Dinliyorum",
    detail: "Konuşurken canlı dalga ve transkript aynı anda güncellenir.",
  },
  thinking: {
    title: "Yorumluyorum",
    detail: "Duyduğum komutu bağlamla eşleştirip en iyi yanıtı hazırlıyorum.",
  },
  speaking: {
    title: "Yanıtlıyorum",
    detail: "İstersen cevabı sesli olarak aktarırım ve eller serbest modda devam ederim.",
  },
  done: {
    title: "Tamamlandı",
    detail: "İstersen tekrar dinleme moduna geçebilir veya sonucu metin olarak düzenleyebilirsin.",
  },
  error: {
    title: "Mikrofon sorunu",
    detail: "Tarayıcı izinlerini veya cihaz girişini kontrol etmen gerekiyor olabilir.",
  },
}

const isBrowser = typeof window !== "undefined"

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function now() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function clampText(input: string, limit = 3000) {
  const normalized = String(input || "").trim()
  return normalized.length > limit ? normalized.slice(0, limit) : normalized
}

function useRealViewport() {
  React.useEffect(() => {
    if (!isBrowser) return

    const updateHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    updateHeight()
    window.addEventListener("resize", updateHeight)
    window.addEventListener("orientationchange", updateHeight)
    return () => {
      window.removeEventListener("resize", updateHeight)
      window.removeEventListener("orientationchange", updateHeight)
    }
  }, [])
}

function useTypingEffect(text: string, enabled: boolean) {
  const [displayed, setDisplayed] = React.useState(enabled ? "" : text)
  const [done, setDone] = React.useState(!enabled)

  React.useEffect(() => {
    if (!enabled) {
      setDisplayed(text)
      setDone(true)
      return
    }

    setDisplayed("")
    setDone(false)
    let index = 0
    const interval = window.setInterval(() => {
      index += 1
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(interval)
        setDone(true)
      }
    }, 15)

    return () => window.clearInterval(interval)
  }, [enabled, text])

  return { displayed, done }
}

function buildFallbackAnswer(question: string, firstName: string) {
  const lower = question.toLocaleLowerCase("tr-TR")

  if (lower.includes("stok")) {
    return `${firstName}, demo modunda gördüğüm hızlı aksiyon: düşük stoktaki ürünleri ABC önceliğine göre grupla, ilk üç ürün için tedarik süresini teyit et ve kampanya baskısı olan ürünleri bugün ayır.`
  }

  if (lower.includes("rapor") || lower.includes("satış")) {
    return `${firstName}, kısa yönetici özeti: satış ritmi stabil, yüksek marjlı ürünler öne çıkıyor ve bugün için en mantıklı aksiyon kampanya sonrası geri dönen kullanıcıları ikinci teklif akışına almak.`
  }

  if (lower.includes("toplantı") || lower.includes("brief")) {
    return `${firstName}, toplantı için önerdiğim yapı: 1) bugünün kritik sinyalleri, 2) riskli başlıklar, 3) hızlı kazanımlar, 4) ekip sahipleri, 5) gün sonu beklenen çıktı.`
  }

  return `${firstName}, canlı servis erişilebilir değilse bile demo modunda net bir yön öneriyorum: isteği üç parçaya ayır, önceliği belirle, ardından ekip veya operasyon için uygulanabilir adımları tek liste halinde çıkar.`
}

export default function AIChatPage() {
  useRealViewport()

  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const {
    loading: authLoading,
    fullName,
    userId,
    tenantId,
    role,
    signOut,
  } = useAuth()

  const greetingSpokenRef = React.useRef<string | null>(null)
  const chatEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const speakRef = React.useRef<(value: string) => void>(() => {})
  const startListeningRef = React.useRef<() => Promise<void>>(async () => {})
  const stopListeningRef = React.useRef<(closePanel: boolean) => void>(() => {})
  const toastTimerRef = React.useRef<number | null>(null)
  const micTimeoutRef = React.useRef<number | null>(null)
  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null)
  const isRecordingRef = React.useRef(false)
  const stopRequestedRef = React.useRef(false)
  const finalTranscriptRef = React.useRef("")
  const fallbackNoticeRef = React.useRef(false)

  const firstName = (fullName || "Patron").split(" ")[0]
  const activeTenantId = tenantId ?? "dev_tenant_123"
  const activeUserId = userId ?? "dev_user_123"
  const canUse = !authLoading && (!role || ["admin", "seller", "owner"].includes(role))
  const dateLabel = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
  }).format(new Date())

  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Msg[]>([])
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)
  const [lastError, setLastError] = React.useState<string | null>(null)
  const [keyboardRaised, setKeyboardRaised] = React.useState(false)
  const [voiceOpen, setVoiceOpen] = React.useState(false)
  const [handsfree, setHandsfree] = React.useState(false)
  const [autoSpeak, setAutoSpeak] = React.useState(true)
  const [autoSendOnStop, setAutoSendOnStop] = React.useState(true)
  const [voiceState, setVoiceState] = React.useState<VoiceState>("idle")
  const [voiceText, setVoiceText] = React.useState("")
  const [chatHistory, setChatHistory] = React.useState<ChatSession[]>(MOCK_HISTORY)

  const showcaseVisible = messages.length <= 1
  const voicePanelVisible = voiceOpen || voiceState !== "idle" || Boolean(voiceText)
  const voiceMeta = VOICE_COPY[voiceState]
  const latestAssistantMessage = React.useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant") ?? null,
    [messages]
  )

  const showToast = React.useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
    }, 2200)
  }, [])

  React.useEffect(() => {
    if (!isBrowser) return
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      setKeyboardRaised(viewport.height < window.innerHeight * 0.8)
    }

    viewport.addEventListener("resize", handleResize)
    return () => viewport.removeEventListener("resize", handleResize)
  }, [])

  React.useEffect(() => {
    if (!canUse || messages.length > 0) return
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content: `Merhaba ${firstName}. Bugün hangi iş akışını hızlandıralım?`,
        typing: true,
        time: now(),
      },
    ])
  }, [canUse, firstName, messages.length])

  React.useEffect(() => {
    if (!autoSpeak || messages.length === 0) return
    const firstMessage = messages[0]
    if (firstMessage.role !== "assistant") return
    if (greetingSpokenRef.current === firstMessage.id) return

    greetingSpokenRef.current = firstMessage.id
    speakRef.current(firstMessage.content)
  }, [autoSpeak, messages])

  React.useEffect(() => {
    const element = inputRef.current
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`
  }, [text])

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, sending, voicePanelVisible])

  React.useEffect(() => {
    if (!voiceOpen) {
      stopListeningRef.current(false)
      return
    }

    const timer = window.setTimeout(() => {
      void startListeningRef.current()
    }, 280)

    return () => window.clearTimeout(timer)
  }, [voiceOpen])

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current)
      stopListeningRef.current(false)
      stopSpeak()
    }
  }, [])

  function resetMicTimeout() {
    if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current)
    micTimeoutRef.current = window.setTimeout(() => {
      if (!isRecordingRef.current) return
      stopListening(true)
      setHandsfree(false)
      setVoiceOpen(false)
      showToast("Sessizlik algılandı, dinleme kapatıldı.")
    }, 6500)
  }

  function clearMicTimeout() {
    if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current)
    micTimeoutRef.current = null
  }

  function copyText(value: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => showToast("Metin panoya kopyalandı."))
      .catch(() => showToast("Panoya kopyalama yapılamadı."))
  }

  function startNewConversation() {
    closeVoiceStudio()
    setConversationId(null)
    setMessages([])
    setText("")
    setLastError(null)
    setVoiceText("")
    greetingSpokenRef.current = null
    setSidebarOpen(false)
  }

  function pushHistoryPreview(title: string, lastMessage: string, id?: string) {
    setChatHistory((current) => {
      const nextId = id || uid()
      const next = {
        id: nextId,
        title: title.slice(0, 56),
        lastMessage: lastMessage.slice(0, 72),
        time: "Şimdi",
      }

      return [next, ...current.filter((item) => item.id !== nextId)].slice(0, 8)
    })
  }

  async function submitPrompt(rawPrompt: string) {
    const prompt = clampText(rawPrompt, 2500)
    if (!prompt || sending) return

    const previewId = conversationId ?? uid()
    setConversationId((current) => current ?? previewId)
    pushHistoryPreview(prompt, "Yanıt hazırlanıyor...", previewId)
    setMessages((current) => [
      ...current,
      { id: uid(), role: "user", content: prompt, time: now() },
    ])
    setSending(true)
    setLastError(null)
    setVoiceText("")

    try {
      const { data, error } = await supabase.functions.invoke("patron-ai", {
        body: {
          tenant_id: activeTenantId,
          user_id: activeUserId,
          question: prompt,
          conversation_id: conversationId,
        },
      })

      if (error) throw error
      if (!data?.answer) throw new Error(data?.error || "Yanıt üretilemedi.")

      const nextConversationId = String(data?.conversation_id || previewId)
      const answer = String(data.answer).trim()

      setConversationId(nextConversationId)
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: answer,
          typing: true,
          time: now(),
        },
      ])
      pushHistoryPreview(prompt, answer, nextConversationId)

      if (autoSpeak) speak(answer)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Yanıt alınamadı, demo cevap gösteriliyor."
      const fallbackAnswer = buildFallbackAnswer(prompt, firstName)
      setLastError(errorMessage)
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: fallbackAnswer,
          typing: true,
          time: now(),
        },
      ])
      pushHistoryPreview(prompt, fallbackAnswer, previewId)

      if (!fallbackNoticeRef.current) {
        fallbackNoticeRef.current = true
        showToast("Canlı servis yerine demo cevap gösteriliyor.")
      }

      if (autoSpeak) speak(fallbackAnswer)
    } finally {
      setSending(false)
    }
  }

  function stopSpeak() {
    if (!isBrowser) return
    try {
      window.speechSynthesis?.cancel?.()
    } catch {
      return
    }
  }

  function speak(value: string) {
    if (!isBrowser || !value) return

    try {
      stopSpeak()
      const utterance = new SpeechSynthesisUtterance(value)
      utterance.lang = "tr-TR"
      utterance.rate = 1
      utterance.pitch = 1
      utterance.onstart = () => setVoiceState("speaking")
      utterance.onend = () => {
        setVoiceState("done")
        if (handsfree && voiceOpen) {
          window.setTimeout(() => {
            void startListening()
          }, 420)
        }
      }
      utterance.onerror = () => setVoiceState("error")
      window.speechSynthesis.speak(utterance)
    } catch {
      setVoiceState("error")
    }
  }

  function getRecognition() {
    if (!isBrowser) return null
    const voiceWindow = window as VoiceWindow
    const SR = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition
    if (!SR) return null

    const recognition = new SR()
    recognition.lang = "tr-TR"
    recognition.interimResults = true
    recognition.continuous = handsfree
    return recognition
  }

  async function startListening() {
    stopSpeak()
    stopRequestedRef.current = false
    finalTranscriptRef.current = ""

    const recognition = getRecognition()
    if (!recognition) {
      setVoiceState("error")
      showToast("Tarayıcı konuşma tanımayı desteklemiyor.")
      return
    }

    recognitionRef.current = recognition
    isRecordingRef.current = true
    setVoiceState("listening")
    setVoiceText("")
    clearMicTimeout()
    resetMicTimeout()

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      resetMicTimeout()
      let finalText = ""
      let interimText = ""

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const chunk = String(result[0]?.transcript || "")
        if (result.isFinal) finalText += chunk
        else interimText += chunk
      }

      if (finalText.trim()) finalTranscriptRef.current = finalText.trim()
      const combined = [finalTranscriptRef.current, interimText.trim()].filter(Boolean).join(" ").trim()
      setVoiceText(combined)

      if (finalText.trim() && autoSendOnStop) {
        clearMicTimeout()
        stopListening(false)
        setVoiceState("thinking")
        window.setTimeout(() => {
          void submitPrompt(finalText.trim())
        }, 260)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorLike) => {
      isRecordingRef.current = false
      clearMicTimeout()
      if (event.error === "no-speech") {
        setVoiceState("done")
        return
      }

      setVoiceState("error")
      showToast("Mikrofona erişim sağlanamadı.")
    }

    recognition.onend = () => {
      isRecordingRef.current = false
      clearMicTimeout()

      if (!autoSendOnStop && finalTranscriptRef.current) {
        setText((current) =>
          current ? `${current.trim()} ${finalTranscriptRef.current}`.trim() : finalTranscriptRef.current
        )
      }

      if (handsfree && !stopRequestedRef.current && voiceOpen) {
        window.setTimeout(() => {
          void startListening()
        }, 420)
        return
      }

      setVoiceState((current) => (current === "listening" ? "done" : current))
    }

    try {
      recognition.start()
    } catch {
      clearMicTimeout()
      setVoiceState("error")
      showToast("Mikrofon başlatılamadı.")
    }
  }

  function stopListening(closePanel: boolean) {
    clearMicTimeout()
    stopRequestedRef.current = true
    isRecordingRef.current = false

    try {
      recognitionRef.current?.stop?.()
    } catch {
      return
    } finally {
      recognitionRef.current = null
    }

    if (closePanel) {
      setVoiceOpen(false)
      setHandsfree(false)
      setVoiceState("idle")
      setVoiceText("")
      finalTranscriptRef.current = ""
      return
    }

    setVoiceState((current) => (current === "listening" ? "done" : current))
  }

  function openVoiceStudio() {
    setVoiceOpen(true)
    setLastError(null)
  }

  function closeVoiceStudio() {
    stopSpeak()
    stopListening(true)
  }

  speakRef.current = speak
  startListeningRef.current = startListening
  stopListeningRef.current = stopListening

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  if (authLoading) {
    return (
      <div className="cs-loader-screen">
        <div className="cs-loader-orb" />
        <p>Komut stüdyosu hazırlanıyor...</p>
      </div>
    )
  }

  return (
    <div className="cs-page">
      <div className="cs-bg-grid" />
      <div className="cs-gradient cs-gradient-a" />
      <div className="cs-gradient cs-gradient-b" />
      <div className="cs-gradient cs-gradient-c" />

      <div className="cs-shell">
        <aside className="cs-rail">
          <button className="cs-rail-brand" onClick={startNewConversation} type="button">
            <BrandMark size={30} className="cs-rail-brand-core" />
          </button>

          <div className="cs-rail-actions">
            {RAIL_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="cs-rail-button"
                onClick={() => {
                  if (action.id === "new") startNewConversation()
                  if (action.id === "history") setSidebarOpen(true)
                  if (action.id === "voice") openVoiceStudio()
                  if (action.id === "search") inputRef.current?.focus()
                }}
                title={action.label}
              >
                <Icon name={action.icon} />
              </button>
            ))}
          </div>

          <div className="cs-rail-footer">
            <span className="cs-rail-footer-dot" />
            <span>CS</span>
          </div>
        </aside>

        <div className="cs-app">
          <motion.header
            className="cs-topbar"
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="cs-topbar-left">
              <button
                type="button"
                className="cs-icon-button cs-mobile-only"
                onClick={() => setSidebarOpen(true)}
              >
                <Icon name="menu" />
              </button>

              <div className="cs-brand-lockup">
                <BrandMark size={44} className="cs-brand-orb" />
                <div>
                  <div className="cs-brand-title">Eagle Command AI</div>
                  <div className="cs-brand-subtitle">
                    <span className="cs-live-dot" />
                    Voice-first command studio
                  </div>
                </div>
              </div>
            </div>

            <div className="cs-topbar-center">
              <span>{dateLabel}</span>
              <strong>Daily Nixio</strong>
            </div>

            <div className="cs-topbar-right">
              <button type="button" className="cs-pill-button cs-upgrade-button">
                <Icon name="badge" />
                Pro Studio
              </button>
              <button type="button" className="cs-icon-button" onClick={toggleTheme}>
                <Icon name={theme === "dark" ? "sun" : "moon"} />
              </button>
              <button type="button" className="cs-icon-button" onClick={openVoiceStudio}>
                <Icon name="mic" />
              </button>
              <button type="button" className="cs-icon-button" onClick={startNewConversation}>
                <Icon name="plus" />
              </button>
              <button type="button" className="cs-icon-button danger" onClick={() => void handleSignOut()}>
                <Icon name="logout" />
              </button>
            </div>
          </motion.header>

          <main className="cs-main">
            <AnimatePresence initial={false}>
              {showcaseVisible && (
                <motion.section
                  className="cs-showcase"
                  key="showcase"
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <div className="cs-showcase-hero">
                    <div className="cs-kicker-row">
                      <span className="cs-kicker-pill">Command workspace</span>
                      <span className="cs-kicker-pill subtle">
                        <Icon name="planet" />
                        Ses, metin ve görev akışları tek yerde
                      </span>
                    </div>

                    <div className="cs-headline-block">
                      <p className="cs-overline">Yeni nesil operasyon yüzeyi</p>
                      <h1>Merhaba {firstName}, bugün büyük resmi birlikte netleştirelim.</h1>
                      <p className="cs-lead">
                        Referans görseldeki yumuşak kart düzenini daha güçlü bir komut merkezi
                        deneyimine taşıdım. Hızlı aksiyonlar, canlı durum kartları ve gelişmiş sesli
                        etkileşim aynı akışta birleşiyor.
                      </p>
                    </div>

                    <div className="cs-hero-actions">
                      <button
                        type="button"
                        className="cs-primary-button"
                        onClick={() =>
                          void submitPrompt("Bugün için yönetici düzeyinde net bir odak planı oluştur.")
                        }
                      >
                        Hızlı plan oluştur
                        <Icon name="arrow-right" />
                      </button>
                      <button
                        type="button"
                        className="cs-secondary-button"
                        onClick={openVoiceStudio}
                      >
                        <Icon name="wave" />
                        Sesli briefing başlat
                      </button>
                    </div>

                    <div className="cs-metric-row">
                      {INSIGHT_METRICS.map((metric) => (
                        <div key={metric.label} className="cs-metric-card">
                          <span className="cs-metric-label">{metric.label}</span>
                          <strong>{metric.value}</strong>
                          <p>{metric.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <motion.div
                    className="cs-bot-panel"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.12, duration: 0.45 }}
                  >
                    <div className="cs-bot-greeting">
                      <span>Hızlı not</span>
                      <strong>{voiceMeta.title}</strong>
                    </div>

                    <motion.div
                      className="cs-bot-figure"
                      animate={{ y: [0, -10, 0], rotate: [0, 1.2, -1.2, 0] }}
                      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="cs-bot-head">
                        <div className="cs-bot-face">
                          <span className="cs-bot-eye" />
                          <span className="cs-bot-eye" />
                          <span className="cs-bot-mouth" />
                        </div>
                      </div>
                      <div className="cs-bot-body" />
                      <div className="cs-bot-arm left" />
                      <div className="cs-bot-arm right" />
                    </motion.div>

                    <div className="cs-bot-summary">
                      <div>
                        <span className="cs-bot-summary-label">Sesli stüdyo</span>
                        <strong>{voiceMeta.title}</strong>
                      </div>
                      <p>{voiceMeta.detail}</p>
                    </div>
                  </motion.div>

                  <div className="cs-card-grid">
                    {FEATURE_CARDS.map((card) => (
                      <motion.button
                        key={card.title}
                        type="button"
                        className="cs-feature-card"
                        data-tone={card.tone}
                        whileHover={{ y: -6 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => void submitPrompt(card.prompt)}
                      >
                        <div className="cs-feature-icon">
                          <Icon name={card.icon} />
                        </div>
                        <span className="cs-feature-kicker">{card.kicker}</span>
                        <strong>{card.title}</strong>
                        <p>{card.body}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <section className="cs-thread-panel">
              <div className="cs-thread-header">
                <div>
                  <span className="cs-panel-kicker">Live workspace</span>
                  <h2>Komut akışı</h2>
                </div>

                <div className="cs-chip-row">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="cs-action-chip"
                      onClick={() => void submitPrompt(action.prompt)}
                    >
                      <Icon name={action.icon} />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {!showcaseVisible && latestAssistantMessage && (
                <motion.div
                  className="cs-compact-summary"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div>
                    <span className="cs-panel-kicker">Son AI notu</span>
                    <p>{latestAssistantMessage.content}</p>
                  </div>
                  <button
                    type="button"
                    className="cs-secondary-button compact"
                    onClick={openVoiceStudio}
                  >
                    <Icon name="mic" />
                    Sesli devam et
                  </button>
                </motion.div>
              )}

              <div
                className="cs-message-scroll"
                style={{ paddingBottom: 36 }}
              >
                {messages.map((message) => (
                  <ChatBubble key={message.id} msg={message} onCopy={copyText} />
                ))}

                {sending && (
                  <motion.div
                    className="cs-message cs-message-assistant"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ThinkingLoader />
                  </motion.div>
                )}

                {lastError && (
                  <motion.div
                    className="cs-inline-alert"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {lastError}
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>
            </section>
          </main>

          <div className={`cs-composer-dock ${keyboardRaised ? "is-raised" : ""} ${voicePanelVisible ? "has-voice" : ""}`}>
            <AnimatePresence>
              {voicePanelVisible && (
                <motion.div
                  className="cs-voice-panel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <div className="cs-voice-panel-head">
                    <div>
                      <span className="cs-panel-kicker">Voice studio</span>
                      <h3>{voiceMeta.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="cs-icon-button"
                      onClick={closeVoiceStudio}
                    >
                      <Icon name="close" />
                    </button>
                  </div>

                  <div className="cs-voice-panel-body">
                    <AIThinking
                      size={92}
                      isActive={voicePanelVisible}
                      state={voiceState}
                      transcript={voiceText}
                      onActivate={openVoiceStudio}
                      onStop={closeVoiceStudio}
                    />

                    <div className="cs-voice-details">
                      <p>{voiceMeta.detail}</p>

                      <div className="cs-voice-toggles">
                        <ToggleRow
                          label="Cevapları sesli oku"
                          value={autoSpeak}
                          onChange={setAutoSpeak}
                        />
                        <ToggleRow
                          label="Dinleme bitince otomatik gönder"
                          value={autoSendOnStop}
                          onChange={setAutoSendOnStop}
                        />
                        <ToggleRow
                          label="Eller serbest modu"
                          value={handsfree}
                          onChange={setHandsfree}
                        />
                      </div>

                      <div className="cs-voice-transcript">
                        {voiceText ? voiceText : "Canlı transkript burada görünecek."}
                      </div>

                      <div className="cs-voice-actions">
                        <button
                          type="button"
                          className="cs-secondary-button compact"
                          onClick={() => {
                            if (voiceState === "listening") {
                              stopListening(false)
                              return
                            }

                            if (!voiceOpen) {
                              openVoiceStudio()
                              return
                            }

                            void startListening()
                          }}
                        >
                          <Icon name="mic" />
                          {voiceState === "listening" ? "Dinlemeyi durdur" : "Dinlemeyi başlat"}
                        </button>
                        <button
                          type="button"
                          className="cs-primary-button compact"
                          onClick={() => {
                            if (voiceText.trim()) setText(voiceText.trim())
                            closeVoiceStudio()
                          }}
                        >
                          Metne aktar
                          <Icon name="arrow-right" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="cs-composer-card">
              <div className="cs-composer-topline">
                <span>Powered by Assistant v3.0</span>
                <span>Kısa komutlar, ses ve bağlam hafızası aynı yüzeyde.</span>
              </div>

              <div className="cs-composer-shell">
                <textarea
                  ref={inputRef}
                  className="cs-textarea"
                  placeholder="Bir soru sor, görev tanımla ya da sesli akışı metne dönüştür..."
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      const draft = text
                      setText("")
                      void submitPrompt(draft)
                    }
                  }}
                />

                <div className="cs-composer-bottom">
                  <div className="cs-chip-row compact">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className="cs-action-chip"
                        onClick={() => void submitPrompt(action.prompt)}
                      >
                        <Icon name={action.icon} />
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="cs-composer-actions">
                    <button type="button" className="cs-icon-button" onClick={openVoiceStudio}>
                      <Icon name="mic" />
                    </button>
                    <button
                      type="button"
                      className="cs-primary-button compact"
                      onClick={() => {
                        const draft = text
                        setText("")
                        void submitPrompt(draft)
                      }}
                      disabled={!text.trim() || sending}
                    >
                      Gönder
                      <Icon name="send" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.button
                type="button"
                className="cs-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                className="cs-drawer"
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
              >
                <div className="cs-drawer-head">
                  <div>
                    <span className="cs-panel-kicker">Conversation memory</span>
                    <h3>Sohbet geçmişi</h3>
                  </div>
                  <button
                    type="button"
                    className="cs-icon-button"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon name="close" />
                  </button>
                </div>

                <button
                  type="button"
                  className="cs-primary-button drawer"
                  onClick={startNewConversation}
                >
                  Yeni sohbet başlat
                  <Icon name="plus" />
                </button>

                <div className="cs-drawer-list">
                  {chatHistory.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className="cs-session-card"
                      onClick={() => {
                        setSidebarOpen(false)
                        showToast("Bu demo sürümünde geçmiş oturum önizleme olarak tutuluyor.")
                      }}
                    >
                      <strong>{session.title}</strong>
                      <p>{session.lastMessage}</p>
                      <span>{session.time}</span>
                    </button>
                  ))}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              className="cs-toast"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function BrandMark({
  size,
  className,
}: {
  size: number
  className?: string
}) {
  return (
    <span
      className={className}
      style={{ width: size, height: size }}
    >
      <Image
        src="/eagle-logo.png"
        alt="Eagle logo"
        width={size}
        height={size}
        className="cs-brand-image"
      />
    </span>
  )
}

function ChatBubble({ msg, onCopy }: { msg: Msg; onCopy: (value: string) => void }) {
  const assistant = msg.role === "assistant"
  const { displayed, done } = useTypingEffect(msg.content, assistant && Boolean(msg.typing))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      className={`cs-message ${assistant ? "cs-message-assistant" : "cs-message-user"}`}
    >
      {assistant && (
        <div className="cs-message-avatar">
          <BrandMark size={34} className="cs-message-avatar-mark" />
        </div>
      )}

      <div className="cs-message-body">
        <div className="cs-message-content">
          {assistant ? <MarkdownText text={displayed} /> : msg.content}
          {assistant && !done && <span className="cs-message-caret" />}
        </div>
        <div className="cs-message-meta">
          {msg.time ? <span>{msg.time}</span> : null}
          <button type="button" className="cs-copy-button" onClick={() => onCopy(msg.content)}>
            <Icon name="copy" />
            Kopyala
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*|`[^`]+`)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).replace(/^\w+\n/, "")
          return (
            <pre key={index} className="cs-code-block">
              <code>{code}</code>
            </pre>
          )
        }

        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={index} className="cs-inline-code">
              {part.slice(1, -1)}
            </code>
          )
        }

        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function ThinkingLoader() {
  return (
    <div className="cs-thinking">
      {[0, 1, 2].map((item) => (
        <motion.span
          key={item}
          animate={{ y: [0, -6, 0], opacity: [0.35, 1, 0.35] }}
          transition={{
            duration: 0.85,
            repeat: Infinity,
            delay: item * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="cs-toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`cs-toggle ${value ? "is-active" : ""}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <motion.span
          className="cs-toggle-thumb"
          animate={{ x: value ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  )
}

function Icon({ name }: { name: IconName }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  switch (name) {
    case "plus":
      return <svg {...props}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
    case "search":
      return <svg {...props}><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
    case "history":
      return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>
    case "mic":
      return <svg {...props}><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" /><path d="M19 11v1a7 7 0 0 1-14 0v-1" /><path d="M12 19v3" /></svg>
    case "spark":
      return <svg {...props}><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /><path d="m5 17 .9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17Z" /></svg>
    case "layers":
      return <svg {...props}><path d="m12 4 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" /></svg>
    case "team":
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 4.13a4 4 0 0 1 0 7.75" /></svg>
    case "calendar":
      return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M3 11h18" /></svg>
    case "wave":
      return <svg {...props}><path d="M2 12c2.5 0 2.5-5 5-5s2.5 10 5 10 2.5-10 5-10 2.5 5 5 5" /></svg>
    case "send":
      return <svg {...props}><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg>
    case "copy":
      return <svg {...props}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    case "sun":
      return <svg {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5" /><path d="M12 19.5V22" /><path d="m4.93 4.93 1.77 1.77" /><path d="m17.3 17.3 1.77 1.77" /><path d="M2 12h2.5" /><path d="M19.5 12H22" /><path d="m4.93 19.07 1.77-1.77" /><path d="m17.3 6.7 1.77-1.77" /></svg>
    case "moon":
      return <svg {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
    case "logout":
      return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
    case "menu":
      return <svg {...props}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
    case "arrow-right":
      return <svg {...props}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
    case "chart":
      return <svg {...props}><path d="M4 19h16" /><path d="M7 15V9" /><path d="M12 15V5" /><path d="M17 15v-3" /></svg>
    case "close":
      return <svg {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
    case "badge":
      return <svg {...props}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.2 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
    case "planet":
      return <svg {...props}><circle cx="12" cy="12" r="4.5" /><path d="M4 13c2.2 1.6 5 2.5 8 2.5 4.4 0 8.2-1.9 10-4.5" /><path d="M2 10c2-2.3 5.6-4 10-4 4.1 0 7.6 1.4 9.7 3.4" /></svg>
    default:
      return <svg {...props}><circle cx="12" cy="12" r="8" /></svg>
  }
}
