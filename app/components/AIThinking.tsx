"use client"

import React, { useEffect, useRef, useState } from "react"

interface AIThinkingProps {
    onActivate?: () => void
    isActive?: boolean
    size?: number
}

export function AIThinking({ onActivate, isActive: externalActive, size = 80 }: AIThinkingProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [internalActive, setInternalActive] = useState(false)
    const isActive = externalActive || internalActive
    const [taskText, setTaskText] = useState("AI is Thinking...")

    // Dynamic radius based on size
    const orbRadius = size * 1.5;

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animationFrameId: number
        const particles: Particle[] = []
        const particleCount = 300

        class Particle {
            phi: number; theta: number; radius: number
            x: number; y: number; z: number
            size: number; speed: number; pulse: number
            renderX: number = 0; renderY: number = 0; renderZ: number = 0
            renderSize: number = 0; opacity: number = 0

            constructor() {
                this.phi = Math.random() * Math.PI * 2
                this.theta = Math.acos((Math.random() * 2) - 1)
                this.radius = orbRadius
                this.x = this.y = this.z = 0
                this.size = Math.random() * 1.5 + 0.5
                this.speed = Math.random() * 0.01 + 0.005
                this.pulse = Math.random() * Math.PI * 2
            }

            update() {
                this.phi += this.speed
                this.pulse += 0.05
                this.x = this.radius * Math.sin(this.theta) * Math.cos(this.phi)
                this.y = this.radius * Math.sin(this.theta) * Math.sin(this.phi)
                this.z = this.radius * Math.cos(this.theta)
                const perspective = 800 / (800 + this.z)
                this.renderX = (this.x * perspective) + 400
                this.renderY = (this.y * perspective) + 400
                this.renderSize = this.size * perspective
                this.opacity = (perspective - 0.5) * 2
            }

            draw(ctx: CanvasRenderingContext2D) {
                const glow = Math.sin(this.pulse) * 0.5 + 0.5
                ctx.beginPath()
                ctx.arc(this.renderX, this.renderY, this.renderSize, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 193, 7, ${this.opacity * (0.3 + glow * 0.7)})`
                ctx.fill()
            }
        }

        for (let i = 0; i < particleCount; i++) particles.push(new Particle())

        const animate = () => {
            ctx.clearRect(0, 0, 800, 800)
            if (isActive) {
                particles.sort((a, b) => b.z - a.z)
                particles.forEach(p => {
                    p.update()
                    p.draw(ctx)
                })
            }
            animationFrameId = requestAnimationFrame(animate)
        }

        animate()
        return () => cancelAnimationFrame(animationFrameId)
    }, [isActive, orbRadius])

    useEffect(() => {
        if (!isActive) return
        const tasks = ["Analyzing context...", "Optimizing response...", "Searching logic..."]
        let idx = 0
        const interval = setInterval(() => {
            idx = (idx + 1) % tasks.length
            setTaskText(tasks[idx])
        }, 3000)
        return () => clearInterval(interval)
    }, [isActive])

    const handleActivate = () => {
        if (!isActive) {
            setInternalActive(true)
            onActivate?.()
        }
    }

    return (
        <div
            className="relative flex items-center justify-center transition-all duration-500"
            style={{
                width: isActive ? '120px' : `${size}px`,
                height: isActive ? '120px' : `${size}px`
            }}
        >
            {/* Iridescent Mic Button */}
            {!isActive && (
                <button
                    onClick={handleActivate}
                    className="absolute z-20 rounded-full flex items-center justify-center transition-all duration-700 cursor-pointer shadow-lg animate-float-slow group"
                    style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #1A237E 0%, #0E1171 50%, #FFC107 100%)',
                        boxShadow: '0 10px 25px rgba(14, 17, 113, 0.4), inset 0 2px 10px rgba(255, 255, 255, 0.2)'
                    }}
                >
                    <div className="absolute inset-[-3px] rounded-full bg-gradient-to-r from-[#1A237E] via-[#0E1171] to-[#FFC107] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
                    <svg
                        className="fill-white drop-shadow-sm"
                        style={{ width: '40%', height: '40%' }}
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                </button>
            )}

            <canvas
                ref={canvasRef}
                width={800}
                height={800}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    transform: 'scale(1.2)'
                }}
            />

            {isActive && (
                <div className="absolute bottom-6 text-center pointer-events-none w-full z-10">
                    <div className="text-[14px] font-medium tracking-[0.1em] uppercase text-[#FFC107] animate-pulse-glow" style={{ textShadow: '0 0 10px rgba(255, 193, 7, 0.4)' }}>
                        {taskText}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float-slow {
                    animation: float-slow 4s ease-in-out infinite;
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    )
}
