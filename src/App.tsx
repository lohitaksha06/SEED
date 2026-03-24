import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/app/AppShell"
import { ProtectedRoute } from "@/components/app/ProtectedRoute"
import { BuyPage } from "@/pages/BuyPage"
import { ChatPage } from "@/pages/ChatPage"
import { SellPage } from "@/pages/SellPage"
import { SignInPage } from "@/pages/SignInPage"

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/buy" replace />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <SellPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/buy" replace />} />
    </Routes>
  )
}

export default App