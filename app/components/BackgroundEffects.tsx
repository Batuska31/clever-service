"use client";

import { useEffect, useState } from "react";

export function BackgroundEffects() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <>
            <div className="aurora-bg">
                <div className="swoosh"></div>
                <div className="swoosh"></div>
                <div className="swoosh"></div>
            </div>
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white animate-float"
                        style={{
                            width: Math.random() * 3 + 1 + "px",
                            height: Math.random() * 3 + 1 + "px",
                            left: Math.random() * 100 + "%",
                            top: Math.random() * 100 + "%",
                            opacity: Math.random() * 0.5 + 0.1,
                            animationDuration: Math.random() * 10 + 10 + "s",
                            animationDelay: Math.random() * 5 + "s",
                            boxShadow: "0 0 8px 2px rgba(255,255,255,0.2)"
                        }}
                    />
                ))}
            </div>
        </>
    );
}
