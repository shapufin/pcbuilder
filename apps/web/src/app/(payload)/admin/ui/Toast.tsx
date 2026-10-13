'use client'

import * as React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type?: ToastType
}

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastType
  type?: ToastType
}

export interface ToastContextValue {
  showToast: (title: string, description?: string, type?: ToastType) => void
  toast: (opts: ToastOptions) => void
}

const ToastContext = React.createContext<ToastContextValue>({
  showToast: () => {},
  toast: () => {},
})

export const useToast = () => React.useContext(ToastContext)

export interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const showToast = React.useCallback(
    (title: string, description?: string, type: ToastType = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      const newToast: ToastMessage = { id, title, description, type }
      setToasts((prev) => [...prev, newToast])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    [],
  )

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      showToast(opts.title, opts.description, opts.variant || opts.type || 'success')
    },
    [showToast],
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      <div className="bmr-toast-viewport" aria-live="polite">
        {toasts.map((toast) => {
          let Icon = CheckCircle2
          if (toast.type === 'error') Icon = AlertCircle
          else if (toast.type === 'warning') Icon = AlertCircle
          else if (toast.type === 'info') Icon = Info

          return (
            <div
              key={toast.id}
              className={clsx('bmr-toast', `bmr-toast--${toast.type || 'success'}`)}
            >
              <Icon className="bmr-toast__icon" />
              <div className="bmr-toast__body">
                <div className="bmr-toast__title">{toast.title}</div>
                {toast.description && (
                  <div className="bmr-toast__description">{toast.description}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="bmr-toast__close"
                aria-label="Close toast"
              >
                <X className="bmr-toast__close-icon" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
