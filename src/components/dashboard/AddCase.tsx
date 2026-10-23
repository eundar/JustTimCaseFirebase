"use client"

import { useState } from "react"
import { BriefcaseBusiness } from "lucide-react"
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
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"

import type { Case } from "@/types/models"

type NewCase = Omit<Case, "id" | "ownerId">

interface AddCaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddCase({ open, onOpenChange }: AddCaseProps) {
  const { clients } = useClients()
  const { addCase } = useCases()
  const [formData, setFormData] = useState<NewCase>({
    title: "",
    clientId: "",
    clientName: "",
    type: "Other",
    status: "Active",
    openDate: new Date().toISOString().split("T")[0],
  })

  const [errors, setErrors] = useState<Partial<NewCase>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const caseTypes = ["Other"]

  const validateForm = (): boolean => {
    const newErrors: Partial<NewCase> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Case title is required"
    }

    if (!formData.clientId) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.openDate) {
      newErrors.openDate = "Open date is required"
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
      await addCase(formData)
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
      title: "",
      clientId: "",
      clientName: "",
      type: "Other",
      status: "Active",
      openDate: new Date().toISOString().split("T")[0],
    })
    setErrors({})
    setSubmitError(null)
  }
  console.log("Selected client ID:", formData.clientId)

  console.log(
    "Selected client:",
    clients.find((client) => client.id === formData.clientId)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-14">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Create New Case
              </DialogTitle>
              <DialogDescription>
                Add the case details and link it to a client.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Case Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Smith v. Johnson"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              aria-invalid={Boolean(errors.title)}
              className={`h-10 ${errors.title ? "border-destructive" : ""}`}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    clientId: value as NewCase["clientId"],
                  })
                }
              >
                <SelectTrigger
                  id="client"
                  aria-invalid={Boolean(errors.clientId)}
                  className="h-10"
                >
                  <SelectValue>
                    {clients.find((client) => client.id === formData.clientId)
                      ?.name ?? "Select a client"}
                  </SelectValue>
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
              <Label htmlFor="type" className="text-sm font-medium">
                Case Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as NewCase["type"] })
                }
              >
                <SelectTrigger
                  id="type"
                  aria-invalid={Boolean(errors.type)}
                  className="h-10"
                >
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypes.map((type) => (
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="openDate" className="text-sm font-medium">
              Open Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="openDate"
              type="date"
              value={formData.openDate}
              onChange={(e) =>
                setFormData({ ...formData, openDate: e.target.value })
              }
              aria-invalid={Boolean(errors.openDate)}
              className={`h-10 ${errors.openDate ? "border-destructive" : ""}`}
            />
            {errors.openDate && (
              <p className="text-sm text-destructive">{errors.openDate}</p>
            )}
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
            {submitting ? "Creating..." : "Create Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
