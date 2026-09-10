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
import { useClients } from "@/hooks/useClients"

import type { Client } from "@/types/models"

type NewClient = Omit<Client, "id" | "ownerId">

interface AddClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddClient({ open, onOpenChange }: AddClientProps) {
  const { addClient } = useClients()
  const [formData, setFormData] = useState<NewClient>({
    name: "",
    email: "",
    phone: "",
  })

  const [errors, setErrors] = useState<Partial<NewClient>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: Partial<NewClient> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required"
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = "Phone must contain numbers only"
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
      await addClient(formData)
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
      name: "",
      email: "",
      phone: "",
    })
    setErrors({})
    setSubmitError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Enter the client's information to add them to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter client's full name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Adding..." : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
