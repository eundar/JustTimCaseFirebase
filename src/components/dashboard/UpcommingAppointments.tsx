import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, Clock } from "lucide-react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { getAppointmentsWithDetails } from "@/lib/derived"

export function UpcommingAppointments() {
  const { clients, loading: clientsLoading, error: clientsError } = useClients()
  const { cases, loading: casesLoading, error: casesError } = useCases()
  const {
    appointments: allAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointments()

  if (clientsError || casesError || appointmentsError) {
    return (
      <p className="text-sm text-red-500">
        Failed to load data. Please try again later.
      </p>
    )
  }

  if (clientsLoading || casesLoading || appointmentsLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  const appointments = getAppointmentsWithDetails(
    allAppointments,
    clients,
    cases
  )

  const upcomingAppointments = appointments
    .filter((apt) => apt.status === "Scheduled" || apt.status === "Confirmed")
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Next scheduled appointments for your clients.
            </CardDescription>
          </div>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {upcomingAppointments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Date & Time
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {upcomingAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="text-sm font-medium">
                    {appointment.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {appointment.client?.name || "N/A"}
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell className="text-sm">
                    {appointment.date} at {appointment.time}
                  </TableCell>
                  <TableCell className="text-sm">
                    {appointment.location}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        appointment.status === "Confirmed"
                          ? "default"
                          : appointment.status === "Scheduled"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No upcoming appointments scheduled.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
