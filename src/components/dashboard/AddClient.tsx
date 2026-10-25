"use client"

import { useState } from "react"
import { UserRoundPen, UserRoundPlus } from "lucide-react"
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

import type { Client } from "@/domain/models"

type NewClient = Omit<Client, "id" | "ownerId">

interface AddClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When set, the dialog edits this client instead of adding a new one.
  client?: Client
}

export default function AddClient({
  open,
  onOpenChange,
  client,
}: AddClientProps) {
  const { addClient, updateClient } = useClients()
  const isEditing = Boolean(client)
  const [formData, setFormData] = useState<NewClient>({
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
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
      if (client) {
        await updateClient(client.id, formData)
      } else {
        await addClient(formData)
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
      name: "",
      email: "",
      phone: "",
    })
    setErrors({})
    setSubmitError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-14">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isEditing ? (
                <UserRoundPen className="size-5" aria-hidden="true" />
              ) : (
                <UserRoundPlus className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isEditing ? "Edit Client" : "Add New Client"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update this client's contact information."
                  : "Add a client's contact information to your firm's records."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter client's full name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              aria-invalid={Boolean(errors.name)}
              className={`h-10 ${errors.name ? "border-destructive" : ""}`}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                aria-invalid={Boolean(errors.email)}
                className={`h-10 ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="09123456789"
                maxLength={11}
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                aria-invalid={Boolean(errors.phone)}
                className={`h-10 ${errors.phone ? "border-destructive" : ""}`}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

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
                ? "Adding..."
                : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
