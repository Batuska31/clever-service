"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "dark" | "light"

interface ThemeCtx {
    theme: Theme
    toggleTheme: () => void
    setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({
    theme: "dark",
    toggleTheme: () => { },
    setTheme: () => { },
})

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem("clever-theme") as Theme | null
        if (saved === "light" || saved === "dark") {
            setThemeState(saved)
            document.documentElement.setAttribute("data-theme", saved)
        }
    }, [])

    const setTheme = (t: Theme) => {
        setThemeState(t)
        localStorage.setItem("clever-theme", t)
        document.documentElement.setAttribute("data-theme", t)
    }

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    if (!mounted) return <>{children}</>

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
