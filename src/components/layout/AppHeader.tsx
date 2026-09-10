import { Bell, Search } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
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
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>

        <div className="hidden sm:block">
          <p className="text-sm font-medium">John Doe</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
      </div>
    </header>
  )
}
