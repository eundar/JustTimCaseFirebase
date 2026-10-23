import { Link } from "react-router"
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
  Briefcase,
  UserCircle,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

const navigation = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/app",
  },
  {
    title: "Clients",
    icon: Users,
    path: "/app/clients",
  },
  {
    title: "Cases",
    icon: Briefcase,
    path: "/app/cases",
  },
  {
    title: "Documents",
    icon: FileText,
    path: "/app/documents",
  },
  {
    title: "Appointments",
    icon: CalendarDays,
    path: "/app/appointments",
  },
  {
    title: "Client Intake Forms",
    icon: FileText,
    path: "/app/intakeforms",
  },
]

export function AppSidebar() {
  const { signOut } = useAuth()

  return (
    <Sidebar>
      <SidebarHeader className="h-16 border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">
          Burdeos Law Firm
        </h1>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroupLabel className="px-3 pb-2 text-xs tracking-wider text-[#F8FAFC] uppercase">
          Main Menu
        </SidebarGroupLabel>{" "}
        <SidebarMenu>
          {navigation.map((item) => (
            <Link to={item.path} className="flex items-center gap-2">
              <SidebarMenuButton key={item.path} className="h-11 px-3 text-sm">
                <item.icon className="size-5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </Link>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuItem>
          <Link to={"/app/settings"}>
            <SidebarMenuButton>
              <UserCircle />
              Profile
            </SidebarMenuButton>
          </Link>
          <SidebarMenuButton onClick={() => signOut()}>
            <LogOut className="size-5" />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}
