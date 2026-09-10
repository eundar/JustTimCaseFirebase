import { Briefcase, CalendarDays, FileText, Users } from "lucide-react"

import { StatsCard } from "@/components/dashboard/StatsCard"
import { RecentCases } from "@/components/dashboard/RecentCases"
import { UpcommingAppointments } from "@/components/dashboard/UpcommingAppointments"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { useDocuments } from "@/hooks/useDocuments"
import { getStatistics } from "@/lib/derived"
import { Link } from "react-router"

export default function Dashboard() {
  const { clients, loading: clientsLoading, error: clientsError } = useClients()
  const { cases, loading: casesLoading, error: casesError } = useCases()
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointments()
  const {
    documents,
    loading: documentsLoading,
    error: documentsError,
  } = useDocuments()

  if (clientsError || casesError || appointmentsError || documentsError) {
    return (
      <p className="text-sm text-red-500">
        Failed to load data. Please try again later.
      </p>
    )
  }

  if (
    clientsLoading ||
    casesLoading ||
    appointmentsLoading ||
    documentsLoading
  ) {
    return <Skeleton className="h-64 w-full" />
  }

  const statistics = getStatistics(clients, cases, appointments, documents)

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
