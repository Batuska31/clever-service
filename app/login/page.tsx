"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-store"
import { motion, AnimatePresence } from "framer-motion"

export default function LoginPage() {
    const { signIn, signUp } = useAuth()
    const router = useRouter()

    const [tab, setTab] = useState<"login" | "signup">("login")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        if (tab === "login") {
            const res = await signIn(email, password)
            if (res.error) {
                setError(res.error)
                setLoading(false)
            } else {
                router.push("/chat")
            }
        } else {
            if (!fullName.trim()) {
                setError("İsim alanı boş olamaz")
                setLoading(false)
                return
            }
            const res = await signUp(email, password, fullName)
            if (res.error) {
                setError(res.error)
                setLoading(false)
            } else {
                setSuccess("Hesap oluşturuldu! E-postanızı kontrol edin.")
                setLoading(false)
                setTab("login")
            }
        }
    }

    const [particles] = useState(() =>
        Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2.5 + 0.5,
            duration: Math.random() * 25 + 15,
            delay: Math.random() * 12,
            drift: Math.random() * 40 - 20,
        }))
    )

    return (
        <div className="login-page">
            {/* Aurora BG */}
            <div className="aurora-bg" />

            {/* Animated gradient orbs */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1, pointerEvents: "none" }}>
                <motion.div
                    style={{
                        position: "absolute",
                        width: "min(500px, 80vw)",
                        height: "min(500px, 80vw)",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(14,17,113,0.28), transparent 65%)",
                        top: "-15%",
                        left: "-15%",
                        filter: "blur(60px)",
                    }}
                    animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    style={{
                        position: "absolute",
                        width: "min(450px, 70vw)",
                        height: "min(450px, 70vw)",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(74,144,226,0.12), transparent 65%)",
                        bottom: "-20%",
                        right: "-15%",
                        filter: "blur(70px)",
                    }}
                    animate={{ x: [0, -50, 0], y: [0, -60, 0], scale: [1, 0.9, 1] }}
                    transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    style={{
                        position: "absolute",
                        width: "min(300px, 50vw)",
                        height: "min(300px, 50vw)",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(255,193,7,0.08), transparent 60%)",
                        top: "40%",
                        right: "20%",
                        filter: "blur(55px)",
                    }}
                    animate={{ x: [0, 30, -20, 0], y: [0, -25, 20, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            {/* Floating particles */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    style={{
                        position: "absolute",
                        width: p.size,
                        height: p.size,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.15)",
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        zIndex: 2,
                        pointerEvents: "none",
                    }}
                    animate={{
                        y: [0, -80, 0],
                        x: [0, p.drift, 0],
                        opacity: [0, 0.6, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "easeInOut",
                    }}
                />
            ))}

            {/* Login Card */}
            <motion.div
                className="login-card"
                style={{ maxWidth: 420, width: "100%", padding: "40px 32px" }}
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring", damping: 22 }}
            >
                {/* Logo */}
                <motion.div
                    className="login-logo"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                    <div className="login-logo-inner">P</div>
                </motion.div>

                <h1 className="login-title">
                    <span className="text-gradient">Patron AI</span>
                </h1>
                <p className="login-subtitle">Merkezi Operasyon Sistemi</p>

                {/* Tabs */}
                <div className="login-tabs">
                    <button
                        className={`login-tab ${tab === "login" ? "active" : ""}`}
                        onClick={() => { setTab("login"); setError(null); setSuccess(null) }}
                    >
                        Giriş Yap
                    </button>
                    <button
                        className={`login-tab ${tab === "signup" ? "active" : ""}`}
                        onClick={() => { setTab("signup"); setError(null); setSuccess(null) }}
                    >
                        Kayıt Ol
                    </button>
                </div>

                {/* Form */}
                <AnimatePresence mode="wait">
                    <motion.form
                        key={tab}
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4"
                        initial={{ opacity: 0, x: tab === "login" ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: tab === "login" ? 20 : -20 }}
                        transition={{ duration: 0.25 }}
                    >
                        {tab === "signup" && (
                            <div>
                                <label className="login-label">Ad Soyad</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Adınız Soyadınız"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="login-label">E-posta</label>
                            <input
                                type="email"
                                className="input w-full"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@sirket.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="login-label">Parola</label>
                            <input
                                type="password"
                                className="input w-full"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <motion.div
                                className="login-error"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: 14,
                                    background: "rgba(34,197,94,0.08)",
                                    border: "1px solid rgba(34,197,94,0.2)",
                                    color: "#4ade80",
                                    fontSize: "0.8rem",
                                }}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                ✅ {success}
                            </motion.div>
                        )}

                        <motion.button
                            type="submit"
                            disabled={loading}
                            className="btn-primary mt-2 w-full"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ opacity: loading ? 0.6 : 1 }}
                        >
                            {loading ? (
                                <motion.div
                                    style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                />
                            ) : null}
                            {loading
                                ? (tab === "login" ? "Giriş Yapılıyor..." : "Hesap Oluşturuluyor...")
                                : (tab === "login" ? "Sisteme Bağlan" : "Hesap Oluştur")}
                        </motion.button>
                    </motion.form>
                </AnimatePresence>

                {/* Footer */}
                <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "var(--ink-tertiary)" }}>
                    Clever Service © 2024 — AI Destekli Operasyon
                </div>
            </motion.div>
        </div>
    )
}
