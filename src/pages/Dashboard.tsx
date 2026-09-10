import { Briefcase, CalendarDays, FileText, Users } from "lucide-react"

import { StatsCard } from "@/components/dashboard/StatsCard"
import { RecentCases } from "@/components/dashboard/RecentCases"
import { UpcommingAppointments } from "@/components/dashboard/UpcommingAppointments"
import { selectors } from "@/data/mockData.ts"
import { Link } from "react-router"

const statistics = selectors.getStatistics()

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <p className="text-muted-foreground">
          Welcome back. Here's an overview of your law firm.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/clients">
          <StatsCard
            title="Total Clients"
            value={statistics.totalClients.toString()}
            description="+12% from last month"
            icon={Users}
          />
        </Link>

        <Link to="/cases">
          <StatsCard
            title="Active Cases"
            value={statistics.activeCases.toString()}
            description="+5 new cases this month"
            icon={Briefcase}
          />
        </Link>

        <Link to="/documents">
          <StatsCard
            title="Documents"
            value={statistics.totalDocuments.toString()}
            description="+28 this month"
            icon={FileText}
          />
        </Link>
        <Link to="/appointments">
          <StatsCard
            title="Appointments"
            value={statistics.upcomingAppointments.toString()}
            description="Upcoming this week"
            icon={CalendarDays}
          />
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <UpcommingAppointments />
        <RecentCases />
      </div>
    </div>
  )
}
