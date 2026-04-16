import { useState, useEffect, createContext, useContext, useCallback } from "react"

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 4000)
    return () => clearTimeout(timer)
  }, [toasts])

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${colors[t.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm animate-in slide-in-from-right`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
