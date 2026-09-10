import { Briefcase, Mail, User as UserIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export default function Setting() {
  const { user, attorneyProfile, loading } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          The account details you provided when you created your account.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="h-16 w-16 text-lg">
            <AvatarFallback>{getInitials(attorneyProfile?.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">
              {loading
                ? "Loading..."
                : (attorneyProfile?.name ?? "No profile found")}
            </CardTitle>
            <CardDescription>
              {attorneyProfile?.specialization ?? "—"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-3">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="text-sm font-medium">
                {attorneyProfile?.name ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Specialization</p>
              <p className="text-sm font-medium">
                {attorneyProfile?.specialization ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">
                {attorneyProfile?.email ?? user?.email ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
