"use client"

const PARTICLES = Array.from({ length: 40 }, (_, index) => ({
  id: index,
  width: `${Math.random() * 3 + 1}px`,
  height: `${Math.random() * 3 + 1}px`,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  opacity: Math.random() * 0.5 + 0.1,
  duration: `${Math.random() * 10 + 10}s`,
  delay: `${Math.random() * 5}s`,
}))

export function BackgroundEffects() {
  return (
    <>
      <div className="aurora-bg">
        <div className="swoosh" />
        <div className="swoosh" />
        <div className="swoosh" />
      </div>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white animate-float"
            style={{
              width: particle.width,
              height: particle.height,
              left: particle.left,
              top: particle.top,
              opacity: particle.opacity,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
              boxShadow: "0 0 8px 2px rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </>
  )
}
