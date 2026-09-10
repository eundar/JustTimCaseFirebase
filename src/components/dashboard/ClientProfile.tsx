"use client"

import { Mail, Phone, User, Briefcase, Calendar, FileText } from "lucide-react"
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
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { useDocuments } from "@/hooks/useDocuments"
import {
  getClientById,
  getCasesByClientId,
  getAppointmentsByClientId,
  getDocumentsByClientId,
} from "@/lib/derived"

interface ClientProfileProps {
  clientId: string
}

export function ClientProfile({ clientId }: ClientProfileProps) {
  const {
    clients: allClients,
    loading: clientsLoading,
    error: clientsError,
  } = useClients()
  const {
    cases: allCases,
    loading: casesLoading,
    error: casesError,
  } = useCases()
  const {
    appointments: allAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointments()
  const {
    documents: allDocuments,
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

  const client = getClientById(allClients, clientId)
  const cases = getCasesByClientId(allCases, clientId)
  const appointments = getAppointmentsByClientId(allAppointments, clientId)
  const documents = getDocumentsByClientId(allDocuments, clientId)

  if (!client) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Client not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{client.name}</CardTitle>
              <CardDescription>Client ID: {client.id}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-sm break-all">{client.email}</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Phone</span>
              </div>
              <p className="text-sm">{client.phone}</p>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client ID</span>
              </div>
              <p className="font-mono text-sm">{client.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cases.filter((c) => c.status === "Active").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {cases.length} total cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                appointments.filter(
                  (a) => a.status === "Scheduled" || a.status === "Confirmed"
                ).length
              }
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {appointments.length} total appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documents.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              total documents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Cases
          </CardTitle>
          <CardDescription>
            {cases.length} case{cases.length !== 1 ? "s" : ""} associated with
            this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Open Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.id}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>{caseItem.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          caseItem.status === "Closed"
                            ? "secondary"
                            : caseItem.status === "Pending"
                              ? "outline"
                              : "default"
                        }
                      >
                        {caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{caseItem.openDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No cases found for this client.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </CardTitle>
          <CardDescription>
            {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""} scheduled for this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.id}
                    </TableCell>
                    <TableCell>{appointment.type}</TableCell>
                    <TableCell>{appointment.date}</TableCell>
                    <TableCell>{appointment.time}</TableCell>
                    <TableCell>{appointment.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          appointment.status === "Completed"
                            ? "secondary"
                            : appointment.status === "Confirmed"
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
            <p className="py-4 text-center text-muted-foreground">
              No appointments found for this client.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
            associated with this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.id}</TableCell>
                    <TableCell>{document.name}</TableCell>
                    <TableCell>{document.caseId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{document.type}</Badge>
                    </TableCell>
                    <TableCell>{document.uploadedDate}</TableCell>
                    <TableCell>{document.size}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No documents found for this client.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
