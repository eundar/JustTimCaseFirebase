"use client"

import { useState } from "react"
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

import type { Appointment } from "@/data/mockData.ts"
import { clients, cases } from "@/data/mockData.ts"

type NewAppointment = Omit<Appointment, "id" | "status">

interface ScheduleAppointmentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduleAppointment?: (appointment: NewAppointment) => void
}

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
  onScheduleAppointment,
}: ScheduleAppointmentProps) {
  const [formData, setFormData] = useState<NewAppointment>({
    clientId: "",
    caseId: null,
    type: "",
    date: "",
    time: "",
    location: "",
  })

  const [errors, setErrors] = useState<Partial<NewAppointment>>({})

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
      if (selectedDate < today) {
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

  const handleSubmit = () => {
    if (validateForm()) {
      onScheduleAppointment?.(formData)
      setFormData({
        clientId: "",
        caseId: null,
        type: "",
        date: "",
        time: "",
        location: "",
      })
      setErrors({})
      onOpenChange(false)
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment with a client and attorney.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-select">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value || "" })
              }
            >
              <SelectTrigger
                id="client-select"
                className={errors.clientId ? "border-red-500" : ""}
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
              <p className="text-sm text-red-500">{errors.clientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="case-select">Case (Optional)</Label>
            <Select
              value={formData.caseId || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, caseId: value || null })
              }
            >
              <SelectTrigger id="case-select">
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

          <div className="space-y-2">
            <Label htmlFor="type-select">Appointment Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value || "" })
              }
            >
              <SelectTrigger
                id="type-select"
                className={errors.type ? "border-red-500" : ""}
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
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-input">Date *</Label>
              <Input
                id="date-input"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input">Time *</Label>
              <Input
                id="time-input"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className={errors.time ? "border-red-500" : ""}
              />
              {errors.time && (
                <p className="text-sm text-red-500">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-select">Location *</Label>
            <Select
              value={formData.location}
              onValueChange={(value) =>
                setFormData({ ...formData, location: value || "" })
              }
            >
              <SelectTrigger
                id="location-select"
                className={errors.location ? "border-red-500" : ""}
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
              <p className="text-sm text-red-500">{errors.location}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
