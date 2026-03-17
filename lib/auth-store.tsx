"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthState {
  loading: boolean
  isLoggedIn: boolean
  userId: string | null
  email: string | null
  role: string | null
  tenantId: string | null
  fullName: string | null
  user: User | null
  session: Session | null
}

interface AuthCtx extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const defaultState: AuthState = {
  loading: true,
  isLoggedIn: false,
  userId: null,
  email: null,
  role: null,
  tenantId: null,
  fullName: null,
  user: null,
  session: null,
}

const devState: AuthState = {
  loading: false,
  isLoggedIn: true,
  userId: "dev_user_123",
  email: "dev@cleverservice.ai",
  role: "admin",
  tenantId: "dev_tenant_123",
  fullName: "Dev Patron",
  user: null,
  session: null,
}

const AuthContext = createContext<AuthCtx>({
  ...defaultState,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(devState)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("tenant_id, role, full_name")
        .eq("id", userId)
        .single()

      if (error) throw error

      return {
        tenantId: data?.tenant_id ?? null,
        role: data?.role ?? null,
        fullName: data?.full_name ?? null,
      }
    } catch {
      return { tenantId: null, role: null, fullName: null }
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({ ...defaultState, loading: false })
  }

  const refreshProfile = async () => {
    if (!state.userId) return
    const profile = await fetchProfile(state.userId)
    setState((current) => ({ ...current, ...profile }))
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
