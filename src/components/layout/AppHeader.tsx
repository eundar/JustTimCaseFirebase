import { useState } from "react"
import { Link } from "react-router"
import { Bell, Briefcase, CalendarDays, FileText, Moon, Search, Sun, Users } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/components/theme-provider"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { useDocuments } from "@/hooks/useDocuments"
import { matchesSearch } from "@/lib/utils"

type SearchResult = {
  type: "Client" | "Case" | "Appointment" | "Document"
  icon: typeof Users
  label: string
  sub: string
  path: string
}

function getInitials(name: string | undefined): string {
  if (!name) return "?"
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
}

export function AppHeader() {
  const { attorneyProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const { clients } = useClients()
  const { cases } = useCases()
  const { appointments } = useAppointments()
  const { documents } = useDocuments()

  const q = query.trim()
  const results: SearchResult[] = q
    ? [
        ...clients
          .filter((c) => matchesSearch(q, [c.name, c.email, c.phone]))
          .slice(0, 4)
          .map((c) => ({
            type: "Client" as const,
            icon: Users,
            label: c.name,
            sub: c.email,
            path: `/clients?search=${encodeURIComponent(c.name)}`,
          })),
        ...cases
          .filter((c) => matchesSearch(q, [c.id, c.title]))
          .slice(0, 4)
          .map((c) => ({
            type: "Case" as const,
            icon: Briefcase,
            label: c.title,
            sub: c.id,
            path: `/cases?search=${encodeURIComponent(c.title)}`,
          })),
        ...appointments
          .filter((a) => matchesSearch(q, [a.type, a.date]))
          .slice(0, 4)
          .map((a) => ({
            type: "Appointment" as const,
            icon: CalendarDays,
            label: a.type,
            sub: a.date,
            path: `/appointments?search=${encodeURIComponent(a.date)}`,
          })),
        ...documents
          .filter((d) => matchesSearch(q, [d.name, d.type]))
          .slice(0, 4)
          .map((d) => ({
            type: "Document" as const,
            icon: FileText,
            label: d.name,
            sub: d.type,
            path: `/documents?search=${encodeURIComponent(d.name)}`,
          })),
      ].slice(0, 8)
    : []

  return (
    <header className="flex h-16 items-center gap-4 border-b px-4">
      <SidebarTrigger />

      <Separator orientation="vertical" className="h-6" />

      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          placeholder="Search clients, cases..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        />

        {isFocused && q && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No results found.
              </p>
            ) : (
              results.map((result) => (
                <Link
                  key={`${result.type}-${result.label}-${result.sub}`}
                  to={result.path}
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => {
                    setQuery("")
                    setIsFocused(false)
                  }}
                >
                  <result.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{result.label}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {result.type}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun /> : <Moon />}
      </Button>

      <Button variant="ghost" size="icon">
        <Bell />
      </Button>

      <Link to="/settings" className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{getInitials(attorneyProfile?.name)}</AvatarFallback>
        </Avatar>

        <div className="hidden sm:block">
          <p className="text-sm font-medium">
            {attorneyProfile?.name ?? "..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {attorneyProfile?.specialization ?? "..."}
          </p>
        </div>
      </Link>
    </header>
  )
}
