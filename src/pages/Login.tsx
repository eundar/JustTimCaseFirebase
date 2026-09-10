import { useState, type FormEvent } from "react"
import { Navigate } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"

function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists."
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password."
    case "auth/user-not-found":
      return "No account found with this email."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/invalid-email":
      return "Enter a valid email address."
    default:
      return "Something went wrong. Please try again."
  }
}

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === "sign-in") {
        await signIn(email, password)
      } else {
        await signUp(email, password, name, specialization)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === "sign-in" ? "Sign in" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Sign in to JusTimCase to manage your cases."
              : "Set up your attorney account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Please wait..."
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() =>
              setMode(mode === "sign-in" ? "sign-up" : "sign-in")
            }
          >
            {mode === "sign-in"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
