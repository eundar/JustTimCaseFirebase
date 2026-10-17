import { Link } from "react-router"
import { ArrowRight, Briefcase, Scale, User } from "lucide-react"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1730] px-6 py-12 text-white">
      <section className="w-full max-w-4xl">
        <header className="mb-10 text-center">
          <Scale
            aria-hidden="true"
            className="mx-auto mb-4 h-12 w-12 text-[#e9b949]"
            strokeWidth={1.5}
          />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to Burdeos Law Firm
          </h1>
          <p className="mt-3 text-white/60">
            Choose how you would like to continue.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            to="/login"
            className="group rounded-xl border border-[#2a3a66] bg-[#101f45] p-8 shadow-sm transition hover:-translate-y-1 hover:border-[#e9b949] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#e9b949] focus-visible:outline-none"
          >
            <Briefcase
              aria-hidden="true"
              className="mb-6 h-8 w-8 text-[#e9b949]"
              strokeWidth={1.5}
            />
            <h2 className="text-2xl font-semibold">Lawyer</h2>
            <p className="mt-3 text-white/60">
              Sign in to manage your practice.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 font-medium text-[#e9b949]">
              Continue to login
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>

          <Link
            to="/client-intake-form"
            className="group rounded-xl border border-[#2a3a66] bg-[#101f45] p-8 shadow-sm transition hover:-translate-y-1 hover:border-[#e9b949] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#e9b949] focus-visible:outline-none"
          >
            <User
              aria-hidden="true"
              className="mb-6 h-8 w-8 text-[#e9b949]"
              strokeWidth={1.5}
            />
            <h2 className="text-2xl font-semibold">Client</h2>
            <p className="mt-3 text-white/60">
              Tell us about yourself and your legal matter.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 font-medium text-[#e9b949]">
              Continue to intake form
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        </div>
      </section>
    </main>
  )
}
