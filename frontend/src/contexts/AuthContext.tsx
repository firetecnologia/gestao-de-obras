"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api } from "@/services/api"

interface User {
  id: number
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    const data = await api.login(email, senha) as { access_token: string; user: User }
    localStorage.setItem("token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
