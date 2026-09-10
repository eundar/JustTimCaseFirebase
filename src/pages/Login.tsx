import { useState, type FormEvent } from "react"
import { Navigate } from "react-router"
import { sendPasswordResetEmail } from "firebase/auth"
import { Briefcase, Eye, EyeOff, Lock, Mail, Scale, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { auth } from "@/lib/firebase"
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

const fieldClassName =
  "h-11 w-full rounded-lg border-[#2a3a66] bg-[#101f45] text-sm text-white placeholder:text-white/40 focus-visible:border-[#e9b949] focus-visible:ring-[#e9b949]/30"

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
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

  const handleForgotPassword = async () => {
    setError(null)
    setInfo(null)
    if (!email) {
      setError("Enter your email above first, then click Forgot Password.")
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setInfo("Password reset email sent — check your inbox.")
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col items-center justify-between gap-10 bg-[#0b1730] px-6 py-12">
        <div className="w-full max-w-xs flex-1" />

        <div className="w-full max-w-xs">
          <div className="mb-8 flex flex-col items-center gap-3">
            <Scale className="h-12 w-12 text-[#e9b949]" strokeWidth={1.5} />
            <h1 className="text-center text-lg font-bold tracking-widest text-white">
              CLIENT PORTAL LOGIN
            </h1>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    className={fieldClassName}
                    style={{ paddingLeft: "2.25rem", paddingRight: "0.75rem" }}
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    className={fieldClassName}
                    style={{ paddingLeft: "2.25rem", paddingRight: "0.75rem" }}
                    placeholder="Specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="email"
                className={fieldClassName}
                style={{ paddingLeft: "2.25rem", paddingRight: "0.75rem" }}
                placeholder="Email or Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type={showPassword ? "text" : "password"}
                className={fieldClassName}
                style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-white/40 hover:text-white/70"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {mode === "sign-in" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-white/60 hover:text-[#e9b949] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
            {info && <p className="text-sm text-emerald-400">{info}</p>}

            <Button
              type="submit"
              className="h-11 w-full bg-[#e9b949] font-semibold tracking-wide text-[#0b1730] hover:bg-[#f2c65f]"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : mode === "sign-in"
                  ? "LOGIN"
                  : "CREATE ACCOUNT"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full border-[#e9b949]/50 bg-transparent text-white hover:bg-white/5"
              onClick={() =>
                setMode(mode === "sign-in" ? "sign-up" : "sign-in")
              }
            >
              {mode === "sign-in"
                ? "Create an Account"
                : "Already have an account? Sign in"}
            </Button>
          </form>
        </div>

        <p className="max-w-xs flex-1 text-center text-[11px] leading-relaxed text-white/40">
          By logging in, you agree to the Terms of Service.
          <br />
          Secure connection with 256-bit encryption.
        </p>
      </div>
    </div>
  )
}
