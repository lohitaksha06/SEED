import { useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/useAuth"

type LocationState = {
  from?: string
}

export function SignInPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [mode, setMode] = useState<"signin" | "signup">("signin")

  const state = location.state as LocationState | null
  const redirectPath = state?.from ?? "/buy"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setInfo(null)

    const submitError = mode === "signin" ? await signIn(email, password) : await signUp(email, password)
    setIsSubmitting(false)

    if (submitError) {
      setError(submitError)
      return
    }

    if (mode === "signup") {
      setInfo("Account created. Check your email if confirmation is required.")
      return
    }

    navigate(redirectPath, { replace: true })
  }

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to manage listings and chat with buyers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={mode === "signin" ? "default" : "outline"} onClick={() => setMode("signin")}>Sign in</Button>
            <Button variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>Sign up</Button>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo guide</CardTitle>
          <CardDescription>Use this flow to quickly test Buy, Sell, and Chat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Seller demo</p>
            <p className="text-muted-foreground">Create an account, add a listing in Sell, then publish it.</p>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Buyer demo</p>
            <p className="text-muted-foreground">Sign in as another account, browse Buy, and message seller.</p>
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Chat demo</p>
            <p className="text-muted-foreground">Open the same conversation in two sessions to verify updates.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}