"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { selectors } from "@/data/mockData.ts"
import ScheduleAppointment from "@/components/dashboard/ScheduleAppointment"

const appointments = selectors.getAppointmentsWithDetails()

export default function Appointments() {
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false)
  const [appointmentList, setAppointmentList] = useState(appointments)
  const handleScheduleAppointment = (newAppointment: any) => {
    const appointmentWithId = {
      ...newAppointment,
      id: `APT-${Date.now()}`,
    }
    setAppointmentList([...appointmentList, appointmentWithId])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage client and case appointments.
          </p>
        </div>
        <Button onClick={() => setOpenScheduleDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Appointments</CardTitle>
          <CardDescription>
            Filter appointments by client, or date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by client, or date..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>
            {appointmentList.length} total appointments in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appointment ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {appointmentList.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">
                    {appointment.id}
                  </TableCell>
                  <TableCell>{appointment.client?.name}</TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    {appointment.date} at {appointment.time}
                  </TableCell>
                  <TableCell>{appointment.location}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        appointment.status === "Completed"
                          ? "secondary"
                          : appointment.status === "Pending"
                            ? "outline"
                            : "default"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ScheduleAppointment
        open={openScheduleDialog}
        onOpenChange={setOpenScheduleDialog}
        onScheduleAppointment={handleScheduleAppointment}
      />
    </div>
  )
}
