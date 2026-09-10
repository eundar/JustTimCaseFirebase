import { Bell, Search } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

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

  return (
    <header className="flex h-16 items-center gap-4 border-b px-4">
      <SidebarTrigger />

      <Separator orientation="vertical" className="h-6" />

      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input placeholder="Search clients, cases..." className="pl-9" />
      </div>

      <Button variant="ghost" size="icon">
        <Bell />
      </Button>

      <div className="flex items-center gap-3">
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
      </div>
    </header>
  )
}
