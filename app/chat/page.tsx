"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-store"
import { useTheme } from "@/lib/theme-provider"
import { AIThinking } from "../components/AIThinking"

const isBrowser = typeof window !== "undefined"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Msg = {
    id: string
    role: "user" | "assistant"
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

function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function clampText(s: string, max = 4000) {
    const t = String(s || "")
    return t.length > max ? t.slice(0, max) : t
}

function now() {
    return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
}

// ─── Quick Prompts ───
const QUICK_PROMPTS = [
    { icon: "📊", title: "Rapor Hazırla", desc: "Günlük satış raporunu getir", q: "Günlük satış raporumu göster" },
    { icon: "📦", title: "Stok Durumu", desc: "Düşük stokları kontrol et", q: "Düşük stoktaki ürünleri listele" },
    { icon: "💡", title: "Öneri Al", desc: "İş geliştirme fikirleri", q: "Satışlarımı artırmak için önerilerin neler?" },
    { icon: "🔧", title: "Ayarlar", desc: "Sistem ayarlarını yönet", q: "Hangi sistem ayarlarını düzenleyebilirim?" },
]

// ─── Hooks ───
function useRealVH() {
    React.useEffect(() => {
        if (!isBrowser) return
        function set() {
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty("--vh", `${vh}px`)
        }
        set()
        window.addEventListener("resize", set)
        window.addEventListener("orientationchange", set)
        return () => {
            window.removeEventListener("resize", set)
            window.removeEventListener("orientationchange", set)
        }
    }, [])
}

function useTypingEffect(text: string, speed = 18, enabled = true) {
    const [displayed, setDisplayed] = React.useState("")
    const [done, setDone] = React.useState(false)

    React.useEffect(() => {
        if (!enabled) { setDisplayed(text); setDone(true); return }
        setDisplayed(""); setDone(false)
        let i = 0
        const iv = setInterval(() => {
            i++
            setDisplayed(text.slice(0, i))
            if (i >= text.length) { clearInterval(iv); setDone(true) }
        }, speed)
        return () => clearInterval(iv)
    }, [text, speed, enabled])

    return { displayed, done }
}

function useIsTouch() {
    const [isTouch, setIsTouch] = React.useState(false)
    React.useEffect(() => {
        if (!isBrowser) return
        setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0)
    }, [])
    return isTouch
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AIChatPage() {
    useRealVH()
    const { theme, toggleTheme } = useTheme()

    // === DEV MODE: BYPASS AUTH ===
    const isLoggedIn = true
    const role = "admin"
    const tenantId = "dev_tenant_123"
    const userId = "dev_user_123"
    // =============================

    const isTouch = useIsTouch()
    const router = useRouter()

    // STATE
    const [loading, setLoading] = React.useState(false)
    const [sending, setSending] = React.useState(false)
    const [conversationId, setConversationId] = React.useState<string | null>(null)
    const [messages, setMessages] = React.useState<Msg[]>([])
    const [text, setText] = React.useState("")
    const greetedRef = React.useRef(false)
    const chatEndRef = React.useRef<HTMLDivElement>(null)
    const chatAreaRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLTextAreaElement>(null)

    const [kbVisible, setKbVisible] = React.useState(false)
    const [sidebarOpen, setSidebarOpen] = React.useState(false)
    const [toast, setToast] = React.useState<string | null>(null)

    // Chat history (mock for now)
    const [chatHistory, setChatHistory] = React.useState<ChatSession[]>([
        { id: "1", title: "Satış raporu analizi", lastMessage: "Toplam gelir ₺450K", time: "Bugün" },
        { id: "2", title: "Stok kontrolü", lastMessage: "5 ürün düşük stokta", time: "Dün" },
        { id: "3", title: "Müşteri segmentasyonu", lastMessage: "VIP müşteri listesi hazır", time: "2 gün önce" },
    ])

    // Voice
    const [voiceOpen, setVoiceOpen] = React.useState(false)
    const [voiceMenuOpen, setVoiceMenuOpen] = React.useState(false)
    const [autoSpeak, setAutoSpeak] = React.useState(true)
    const [autoSendOnStop, setAutoSendOnStop] = React.useState(true)
    const [handsfree, setHandsfree] = React.useState(false)
    const [voiceState, setVoiceState] = React.useState<
        "idle" | "listening" | "thinking" | "speaking" | "done" | "error"
    >("idle")
    const [voiceText, setVoiceText] = React.useState("")
    const [lastError, setLastError] = React.useState<string | null>(null)
    const recognitionRef = React.useRef<any>(null)
    const isRecordingRef = React.useRef(false)
    const stopRequestedRef = React.useRef(false)

    const [particles] = React.useState(() => {
        const count = isBrowser && window.innerWidth < 500 ? 10 : 20
        return Array.from({ length: count }, (_, i) => ({
            id: i, x: Math.random() * 100, y: Math.random() * 100,
            size: Math.random() * 2.5 + 0.8, duration: Math.random() * 22 + 14, delay: Math.random() * 10,
        }))
    })

    // Toast helper
    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(null), 2000)
    }

    // Copy text
    function copyText(t: string) {
        navigator.clipboard.writeText(t).then(() => showToast("📋 Kopyalandı!")).catch(() => { })
    }

    // ─── KEYBOARD (iOS) ───
    React.useEffect(() => {
        if (!isBrowser) return
        const vv = (window as any).visualViewport
        if (!vv) return
        function onResize() {
            const isKb = vv.height < window.innerHeight * 0.8
            setKbVisible(isKb)
            if (isKb) setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
        }
        vv.addEventListener("resize", onResize)
        return () => vv.removeEventListener("resize", onResize)
    }, [])

    const canUse = isLoggedIn && (role === "admin" || role === "seller" || role === "owner")

    React.useEffect(() => {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }, [messages, sending])

    // GREETING
    React.useEffect(() => {
        if (!canUse || messages.length > 0) return
        setMessages([{ id: uid(), role: "assistant", content: "Merhaba patron 😄 Sana nasıl yardımcı olabilirim?", typing: true, time: now() }])
    }, [canUse, messages.length])

    React.useEffect(() => {
        if (!autoSpeak || !canUse || greetedRef.current || messages.length === 0) return
        const first = messages[0]
        if (first?.role !== "assistant") return
        greetedRef.current = true
        speak(first.content)
    }, [messages, canUse, autoSpeak])

    // SEND MESSAGE
    async function sendMessage(q: string) {
        if (!q.trim() || !userId || !tenantId) return
        const clean = clampText(q.trim(), 2500)
        const userMsg: Msg = { id: uid(), role: "user", content: clean, time: now() }
        setMessages((prev) => [...prev, userMsg])
        setSending(true)
        setLastError(null)

        try {
            const { data, error } = await supabase.functions.invoke("patron-ai", {
                body: { tenant_id: tenantId, user_id: userId, question: clean, conversation_id: conversationId },
            })
            if (error) throw error
            if (!data?.answer) throw new Error(data?.error || "Cevap üretilemedi")
            if (!conversationId && data?.conversation_id) setConversationId(String(data.conversation_id))
            const answer = String(data?.answer || "").trim() || "Cevap gelmedi."
            setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: answer, typing: true, time: now() }])
            if (autoSpeak) speak(answer)
        } catch (e: any) {
            setLastError(e?.message || "Gönderim hatası")
            setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: "Bir hata oldu, tekrar dener misin? 🙁", typing: true, time: now() }])
        } finally {
            setSending(false)
        }
    }

    function stopSpeak() { if (!isBrowser) return; try { window.speechSynthesis?.cancel?.() } catch { } }

    function speak(t: string) {
        if (!isBrowser) return
        try {
            stopSpeak()
            const u = new SpeechSynthesisUtterance(String(t || ""))
            u.lang = "tr-TR"; u.rate = 1.0; u.pitch = 1.0
            u.onstart = () => setVoiceState("speaking")
            u.onend = () => { setVoiceState("done"); if (handsfree && voiceOpen) setTimeout(() => startListening(), 500) }
            u.onerror = () => setVoiceState("error")
            window.speechSynthesis.speak(u)
        } catch { }
    }

    function getRecognition() {
        if (!isBrowser) return null
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SR) return null
        const rec = new SR(); rec.lang = "tr-TR"; rec.interimResults = true; rec.continuous = handsfree
        return rec
    }

    async function startListening() {
        setLastError(null); stopRequestedRef.current = false
        const rec = getRecognition()
        if (!rec) { setLastError("Tarayıcı konuşma tanımayı desteklemiyor."); setVoiceState("error"); return }
        recognitionRef.current = rec; isRecordingRef.current = true; setVoiceText(""); setVoiceState("listening")
        rec.onresult = (event: any) => {
            try {
                let finalText = "", interimText = ""
                for (let i = 0; i < event.results.length; i++) {
                    const r = event.results[i]
                    if (r.isFinal) finalText += r[0].transcript; else interimText += r[0].transcript
                }
                const display = (finalText + interimText).trim()
                if (display) setVoiceText(display)
                if (finalText.trim() && autoSendOnStop) { stopListening(); setVoiceState("thinking"); setTimeout(() => sendMessage(finalText.trim()), 300) }
            } catch (e) { console.log("onresult error:", e) }
        }
        rec.onerror = (e: any) => { if (e.error !== "no-speech") { setLastError("Mikrofon hatası."); setVoiceState("error") }; isRecordingRef.current = false }
        rec.onend = () => { isRecordingRef.current = false; if (handsfree && !stopRequestedRef.current && voiceOpen) setTimeout(() => startListening(), 350) }
        try { rec.start() } catch { setLastError("Mikrofon başlatılamadı."); setVoiceState("error") }
    }

    function stopListening() { stopRequestedRef.current = true; try { recognitionRef.current?.stop?.() } catch { }; isRecordingRef.current = false; if (voiceState === "listening") setVoiceState("done") }

    React.useEffect(() => {
        if (!voiceOpen) { stopListening(); stopSpeak(); setVoiceMenuOpen(false); return }
        setTimeout(() => startListening(), 300)
    }, [voiceOpen])

    const showQuickPrompts = messages.length <= 1

    // ─── LOADING ───
    if (loading) {
        return (
            <div className="patron-page patron-load-wrap">
                <motion.div className="patron-load-orb" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <div className="patron-load-label">Yükleniyor...</div>
            </div>
        )
    }

    // ─── RENDER ───
    return (
        <div className="patron-page">
            <div className="patron-bg" />

            {/* Particles */}
            {particles.map((p) => (
                <motion.div key={p.id} style={{ position: "absolute", width: p.size, height: p.size, borderRadius: "50%", background: theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)", left: `${p.x}%`, top: `${p.y}%`, zIndex: 1, pointerEvents: "none" as const }}
                    animate={{ y: [0, -70, 0], x: [0, Math.random() * 30 - 15, 0], opacity: [0, 0.45, 0] }}
                    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
                />
            ))}

            {/* Orbs */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1, pointerEvents: "none" as const }}>
                <motion.div className="patron-orb-purple" animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.15, 0.9, 1] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div className="patron-orb-cyan" animate={{ x: [0, -35, 25, 0], y: [0, 35, -20, 0], scale: [1, 0.85, 1.1, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
                <motion.div className="patron-orb-pink" animate={{ x: [0, 20, -30, 0], y: [0, -40, 15, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />
            </div>

            {/* ── HEADER ── */}
            <motion.div className="patron-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
                <div className="patron-header-left">
                    {/* Sidebar toggle */}
                    <motion.button className="patron-header-btn" whileTap={{ scale: 0.92 }} onClick={() => setSidebarOpen(true)} title="Sohbet geçmişi">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" />
                        </svg>
                    </motion.button>
                    <motion.div className="patron-logo-orb" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
                        <div className="patron-logo-inner">P</div>
                    </motion.div>
                    <div>
                        <div className="patron-title">Patron AI</div>
                        <div className="patron-subtitle"><motion.span className="patron-dot" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />Çevrimiçi</div>
                    </div>
                </div>

                <div className="patron-header-right">
                    {/* Theme toggle */}
                    <motion.button className="theme-toggle-btn" whileHover={isTouch ? {} : { scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={toggleTheme} title={theme === "dark" ? "Açık Mod" : "Koyu Mod"}>
                        {theme === "dark" ? (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" /><line x1="12" x2="12" y1="1" y2="3" /><line x1="12" x2="12" y1="21" y2="23" /><line x1="4.22" x2="5.64" y1="4.22" y2="5.64" /><line x1="18.36" x2="19.78" y1="18.36" y2="19.78" /><line x1="1" x2="3" y1="12" y2="12" /><line x1="21" x2="23" y1="12" y2="12" /><line x1="4.22" x2="5.64" y1="19.78" y2="18.36" /><line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </motion.button>

                    <motion.button className="patron-header-btn" whileHover={isTouch ? {} : { scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => setVoiceOpen(true)} title="Sesli sohbet">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                    </motion.button>

                    <motion.button className="patron-header-btn" whileHover={isTouch ? {} : { scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => { setConversationId(null); greetedRef.current = false; setMessages([{ id: uid(), role: "assistant", content: "Yeni sohbet açtım 😄 Ne yapıyoruz patron?", typing: true, time: now() }]) }} title="Yeni sohbet">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
                    </motion.button>

                    <motion.button className="patron-header-btn danger" whileHover={isTouch ? {} : { scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => router.push("/login")} title="Çıkış">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    </motion.button>
                </div>
            </motion.div>

            {/* ── CHAT AREA ── */}
            <div ref={chatAreaRef} className="patron-chat-area" style={{ paddingBottom: kbVisible ? 140 : 250 }}>
                {/* Quick Prompts */}
                {showQuickPrompts && (
                    <motion.div className="quick-prompts" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        {QUICK_PROMPTS.map((p, i) => (
                            <motion.button key={i} className="quick-prompt-card" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => sendMessage(p.q)}>
                                <span className="quick-prompt-icon">{p.icon}</span>
                                <span className="quick-prompt-title">{p.title}</span>
                                <span className="quick-prompt-desc">{p.desc}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((m) => (
                        <ChatBubble key={m.id} msg={m} onCopy={copyText} />
                    ))}
                </AnimatePresence>

                {sending && (
                    <motion.div className="patron-bubble patron-bubble-bot" style={{ padding: "14px 16px" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <ThinkingDots />
                    </motion.div>
                )}

                {lastError && (
                    <motion.div className="patron-bubble-error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>⚠️ {lastError}</motion.div>
                )}

                <div ref={chatEndRef} style={{ height: 1, flexShrink: 0 }} />
            </div>

            {/* ── BOTTOM ── */}
            <div className="patron-bottom-area">
                <div className="prompt-card">
                    <div className="prompt-card-header">Soru veya İstek</div>
                    <textarea
                        ref={inputRef}
                        className="prompt-textarea"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Neye ihtiyacın var?"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                const q = text; setText(""); sendMessage(q)
                                if (isTouch) inputRef.current?.blur()
                            }
                        }}
                    />
                    <div className="prompt-actions">
                        <button className="action-pill" onClick={() => { if (!text.trim()) return; const q = text; setText(""); sendMessage(q); if (isTouch) inputRef.current?.blur() }} style={{ opacity: text.trim() ? 1 : 0.4 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                            Gönder
                        </button>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 20 }}>
                    <AnimatePresence>
                        {(voiceState !== "idle" || !!voiceText) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="w-full max-w-[500px] px-4 py-3 rounded-2xl glass-strong border border-white/10 text-center mb-2"
                            >
                                <div className="text-[11px] uppercase tracking-widest text-[#00f0ff] mb-1 font-semibold">
                                    {voiceState === "listening" && "🎙️ Dinliyorum..."}
                                    {voiceState === "thinking" && "🧠 Düşünüyorum..."}
                                    {voiceState === "speaking" && "🔊 Konuşuyorum..."}
                                    {voiceState === "done" && "✅ Hazır"}
                                </div>
                                {voiceText && (
                                    <div className="text-[13px] text-white/70 italic line-clamp-1 mt-0.5">
                                        "{voiceText}"
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AIThinking
                        size={64}
                        isActive={voiceState === "listening" || voiceState === "speaking" || voiceState === "thinking"}
                        onActivate={() => { setHandsfree(true); startListening() }}
                    />
                </div>
            </div>

            {/* ── SIDEBAR ── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div className="sidebar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
                        <motion.div className="sidebar" initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 30, stiffness: 350 }}>
                            <div className="sidebar-header">
                                <span className="sidebar-title">Sohbet Geçmişi</span>
                                <motion.button className="patron-header-btn" whileTap={{ scale: 0.9 }} onClick={() => setSidebarOpen(false)} style={{ width: 32, height: 32 }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                                </motion.button>
                            </div>

                            <div style={{ padding: "12px 14px" }}>
                                <motion.button className="btn-primary" style={{ width: "100%", fontSize: 13 }} whileTap={{ scale: 0.97 }} onClick={() => {
                                    setConversationId(null); greetedRef.current = false; setSidebarOpen(false)
                                    setMessages([{ id: uid(), role: "assistant", content: "Yeni sohbet açtım 😄 Ne yapıyoruz patron?", typing: true, time: now() }])
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
                                    Yeni Sohbet
                                </motion.button>
                            </div>

                            <div className="sidebar-list">
                                {chatHistory.map((ch) => (
                                    <motion.button key={ch.id} className={`sidebar-item ${conversationId === ch.id ? "active" : ""}`} whileTap={{ scale: 0.97 }} onClick={() => { setSidebarOpen(false) }}>
                                        <span className="sidebar-item-title">{ch.title}</span>
                                        <span className="sidebar-item-sub">{ch.lastMessage} • {ch.time}</span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>


            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div className="toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─────────────────────────────────────────────
// CHAT BUBBLE with actions
// ─────────────────────────────────────────────
function ChatBubble({ msg, onCopy }: { msg: Msg; onCopy: (t: string) => void }) {
    const isBot = msg.role === "assistant"
    const { displayed, done } = useTypingEffect(msg.content, 16, isBot && !!msg.typing)

    return (
        <motion.div
            className={`patron-bubble ${isBot ? "patron-bubble-bot" : "patron-bubble-user"}`}
            layout initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}
        >
            {isBot && <div className="patron-bot-avatar"><span>P</span></div>}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ wordBreak: "break-word" as const }}>
                    {isBot ? <MarkdownText text={displayed} /> : msg.content}
                    {isBot && !done && (<motion.span style={{ color: "rgba(6,255,195,0.8)", fontWeight: 100, marginLeft: 1 }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>|</motion.span>)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {msg.time && <span className="msg-timestamp">{msg.time}</span>}
                    <div className="msg-actions">
                        <button className="msg-action-btn" onClick={() => onCopy(msg.content)} title="Kopyala">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// ─── Simple Markdown ───
function MarkdownText({ text }: { text: string }) {
    const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*|`[^`]+`)/g)
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith("```") && part.endsWith("```")) {
                    const code = part.slice(3, -3).replace(/^\w+\n/, "")
                    return <pre key={i} style={{ background: "rgba(0,0,0,0.2)", padding: "10px 12px", borderRadius: 10, fontSize: 12, overflow: "auto", margin: "6px 0", fontFamily: "var(--font-mono)" }}><code>{code}</code></pre>
                }
                if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                    return <code key={i} style={{ background: "rgba(124,58,237,0.15)", padding: "2px 6px", borderRadius: 5, fontSize: "0.85em", fontFamily: "var(--font-mono)" }}>{part.slice(1, -1)}</code>
                }
                return <span key={i}>{part}</span>
            })}
        </>
    )
}

// ─── Subcomponents ───
function ThinkingDots() {
    return (
        <div style={{ display: "flex", gap: 5, alignItems: "center", height: 18 }}>
            {[0, 1, 2].map((i) => (<motion.div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.45)" }} animate={{ y: [0, -7, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }} />))}
        </div>
    )
}

function VoiceOrb({ state }: { state: string }) {
    const isActive = state === "listening" || state === "speaking" || state === "thinking"
    const color = state === "listening" ? "rgba(6,255,195,0.7)" : state === "speaking" ? "rgba(0,180,255,0.7)" : state === "thinking" ? "rgba(255,200,0,0.7)" : "rgba(255,255,255,0.2)"
    const glowColor = state === "listening" ? "0 0 50px rgba(6,255,195,0.3)" : state === "speaking" ? "0 0 50px rgba(0,180,255,0.3)" : state === "thinking" ? "0 0 50px rgba(255,200,0,0.2)" : "0 0 15px rgba(255,255,255,0.05)"

    return (
        <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isActive && [0, 1, 2].map((i) => (<motion.div key={i} style={{ position: "absolute", borderRadius: "50%", border: `1.5px solid ${color}` }} animate={{ width: [50, 110], height: [50, 110], opacity: [0.35, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }} />))}
            <motion.div style={{ width: 56, height: 56, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${color}, rgba(0,0,0,0.3))`, boxShadow: glowColor }} animate={isActive ? { scale: [1, 1.1, 0.95, 1.08, 1], borderRadius: ["50%", "46%", "50%", "48%", "50%"] } : { scale: 1 }} transition={{ duration: state === "speaking" ? 0.6 : 1.2, repeat: isActive ? Infinity : 0, ease: "easeInOut" }} />
            {state === "listening" && (<div style={{ position: "absolute", display: "flex", gap: 2.5, alignItems: "center" }}>{[0, 1, 2, 3, 4].map((i) => (<motion.div key={i} style={{ width: 2.5, borderRadius: 99, background: "white" }} animate={{ height: [5, 20, 5] }} transition={{ duration: 0.5 + i * 0.04, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }} />))}</div>)}
        </div>
    )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="patron-toggle-row">
            <span style={{ fontSize: 12, opacity: 0.75, flex: 1, lineHeight: 1.3 }}>{label}</span>
            <motion.button className={`patron-toggle ${value ? "active" : ""}`} onClick={() => onChange(!value)} whileTap={{ scale: 0.95 }}>
                <motion.div className="patron-toggle-dot" animate={{ x: value ? 18 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </motion.button>
        </div>
    )
}
