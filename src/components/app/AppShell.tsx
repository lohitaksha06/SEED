import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/features/auth/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function AppShell() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const userEmail = session?.user.email

  const navClassName = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground"
      : "rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-muted/60"

  const onSignOut = async () => {
    const error = await signOut()
    if (error) {
      console.error(error)
      return
    }

    navigate("/buy")
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Marketplace MVP</h1>
            <p className="text-sm text-muted-foreground">Buy, Sell, and Chat</p>
          </div>

          <nav className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <NavLink to="/buy" className={navClassName}>
              Buy
            </NavLink>
            <NavLink to="/sell" className={navClassName}>
              Sell
            </NavLink>
            <NavLink to="/chat" className={navClassName}>
              Chat
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            {userEmail ? (
              <>
                <Badge className="hidden md:inline-flex">{userEmail}</Badge>
                <Button variant="outline" onClick={onSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/signin")}>Sign in</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <main className="pb-6">
        <Outlet />
      </main>
    </div>
  )
}