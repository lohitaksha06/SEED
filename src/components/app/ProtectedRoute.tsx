import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/features/auth/useAuth"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Checking your session...</p>
  }

  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return children
}