"use client"

import { useState } from "react"
import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Appointment } from "@/domain/models"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"

type NewAppointment = Omit<Appointment, "id" | "ownerId" | "status">

interface ScheduleAppointmentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When set, the dialog edits this appointment instead of scheduling one.
  appointment?: Appointment
}

const appointmentStatuses: Appointment["status"][] = [
  "Scheduled",
  "Confirmed",
  "Completed",
  "Pending",
]

const appointmentTypes = [
  "Initial Consultation",
  "Case Review",
  "Settlement Meeting",
  "Client Consultation",
  "Status Update",
  "Document Review",
  "Other",
]

const locations = ["Office", "Virtual", "Client Site"]

export default function ScheduleAppointment({
  open,
  onOpenChange,
  appointment,
}: ScheduleAppointmentProps) {
  const { clients } = useClients()
  const { cases } = useCases()
  const { addAppointment, updateAppointment } = useAppointments()
  const isEditing = Boolean(appointment)
  const [formData, setFormData] = useState<NewAppointment>({
    clientId: appointment?.clientId ?? "",
    caseId: appointment?.caseId ?? null,
    type: appointment?.type ?? "",
    date: appointment?.date ?? "",
    time: appointment?.time ?? "",
    location: appointment?.location ?? "",
  })
  const [status, setStatus] = useState<Appointment["status"]>(
    appointment?.status ?? "Scheduled"
  )

  const [errors, setErrors] = useState<Partial<NewAppointment>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: Partial<NewAppointment> = {}

    if (!formData.clientId.trim()) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.type.trim()) {
      newErrors.type = "Appointment type is required"
    }

    if (!formData.date.trim()) {
      newErrors.date = "Date is required"
    } else {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // An existing appointment may keep its (now past) date, e.g. to mark it completed.
      if (selectedDate < today && formData.date !== appointment?.date) {
        newErrors.date = "Date cannot be in the past"
      }
    }

    if (!formData.time.trim()) {
      newErrors.time = "Time is required"
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      if (appointment) {
        await updateAppointment(appointment.id, { ...formData, status })
      } else {
        await addAppointment({ ...formData, status: "Scheduled" })
      }
      handleReset()
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      clientId: "",
      caseId: null,
      type: "",
      date: "",
      time: "",
      location: "",
    })
    setErrors({})
    setSubmitError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-14">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isEditing ? "Edit Appointment" : "Schedule Appointment"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update the appointment details or status."
                  : "Set a time to meet with a client and link it to a case if needed."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-select" className="text-sm font-medium">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value || "" })
                }
              >
                <SelectTrigger
                  id="client-select"
                  aria-invalid={Boolean(errors.clientId)}
                  className="h-10 w-full"
                >
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && (
                <p className="text-sm text-destructive">{errors.clientId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="case-select" className="text-sm font-medium">
                Case{" "}
                <span className="font-normal text-muted-foreground">
                  (Optional)
                </span>
              </Label>
              <Select
                value={formData.caseId || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    caseId: value && value !== "none" ? value : null,
                  })
                }
              >
                <SelectTrigger id="case-select" className="h-10 w-full">
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {cases.map((caseItem) => (
                    <SelectItem key={caseItem.id} value={caseItem.id}>
                      {caseItem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-select" className="text-sm font-medium">
              Appointment Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value || "" })
              }
            >
              <SelectTrigger
                id="type-select"
                aria-invalid={Boolean(errors.type)}
                className="h-10 w-full"
              >
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-input" className="text-sm font-medium">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date-input"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                aria-invalid={Boolean(errors.date)}
                className={`h-10 ${errors.date ? "border-destructive" : ""}`}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-sm font-medium">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time-input"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                aria-invalid={Boolean(errors.time)}
                className={`h-10 ${errors.time ? "border-destructive" : ""}`}
              />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-select" className="text-sm font-medium">
              Location <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.location}
              onValueChange={(value) =>
                setFormData({ ...formData, location: value || "" })
              }
            >
              <SelectTrigger
                id="location-select"
                aria-invalid={Boolean(errors.location)}
                className="h-10 w-full"
              >
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location}</p>
            )}
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status-select" className="text-sm font-medium">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as Appointment["status"])
                }
              >
                <SelectTrigger id="status-select" className="h-10 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {submitError && (
            <p
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button className="h-10" onClick={handleSubmit} disabled={submitting}>
            {isEditing
              ? submitting
                ? "Saving..."
                : "Save Changes"
              : submitting
                ? "Scheduling..."
                : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
