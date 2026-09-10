"use client"

import { Calendar, FileText, User, Clock, Tag } from "lucide-react"
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
  getCaseById,
  getClientById,
  getDocumentsByCaseId,
  getAppointmentsWithDetails,
} from "@/lib/derived"

interface CaseProfileProps {
  caseId: string
}

export function CaseProfile({ caseId }: CaseProfileProps) {
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const { appointments: allAppointments, loading: appointmentsLoading } =
    useAppointments()
  const { documents: allDocuments, loading: documentsLoading } =
    useDocuments()

  if (
    clientsLoading ||
    casesLoading ||
    appointmentsLoading ||
    documentsLoading
  ) {
    return <Skeleton className="h-64 w-full" />
  }

  const caseData = getCaseById(cases, caseId)
  const documents = getDocumentsByCaseId(allDocuments, caseId)
  const allAppointmentsWithDetails = getAppointmentsWithDetails(
    allAppointments,
    clients,
    cases
  )
  const appointments = allAppointmentsWithDetails.filter(
    (apt) => apt.caseId === caseId
  )

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Case not found</p>
        </CardContent>
      </Card>
    )
  }

  const client = getClientById(clients, caseData.clientId)

  const statusVariant = (status: string) => {
    switch (status) {
      case "Closed":
        return "secondary"
      case "Pending":
        return "outline"
      case "Active":
        return "default"
      default:
        return "default"
    }
  }

  return (
    <div className="space-y-6">
      {/* Case Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{caseData.title}</CardTitle>
              <CardDescription>Case ID: {caseData.id}</CardDescription>
            </div>
            <Badge variant={statusVariant(caseData.status)}>
              {caseData.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Case Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Case Type</span>
              </div>
              <p className="text-sm">{caseData.type}</p>
            </div>

            {/* Open Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Open Date</span>
              </div>
              <p className="text-sm">{caseData.openDate}</p>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client</span>
              </div>
              <p className="text-sm font-medium">{client?.name || "N/A"}</p>
              <p className="text-xs text-muted-foreground">{client?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Appointments
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
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
            associated with this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const docClient = getClientById(clients, doc.clientId)
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.id}</TableCell>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell>{doc.uploadedDate}</TableCell>
                      <TableCell>{doc.size}</TableCell>
                      <TableCell>{docClient?.name || "N/A"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No documents found for this case.
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
            {appointments.length !== 1 ? "s" : ""} associated with this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Client</TableHead>
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
                    <TableCell>{appointment.client?.name || "N/A"}</TableCell>
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
              No appointments found for this case.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
