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
import { selectors } from "@/data/mockData"

interface AddCaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddCase?: (caseData: NewCase) => void
}

import type { Case } from "@/data/mockData"

type NewCase = Omit<Case, "id">

export default function AddCase({
  open,
  onOpenChange,
  onAddCase,
}: AddCaseProps) {
  const [formData, setFormData] = useState<NewCase>({
    title: "",
    clientId: "",
    type: "",
    status: "Active",
    openDate: new Date().toISOString().split("T")[0],
  })

  const [errors, setErrors] = useState<Partial<NewCase>>({})

  const clients = selectors.getAllClients()

  const caseTypes = [
    "Civil",
    "Criminal",
    "Family",
    "Property",
    "Personal Injury",
    "Contract",
    "Employment",
    "Other",
  ]

  const validateForm = (): boolean => {
    const newErrors: Partial<NewCase> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Case title is required"
    }

    if (!formData.clientId) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.type) {
      newErrors.type = "Case type is required"
    }

    if (!formData.openDate) {
      newErrors.openDate = "Open date is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onAddCase?.(formData)
      setFormData({
        title: "",
        clientId: "",
        type: "",
        status: "Active",
        openDate: new Date().toISOString().split("T")[0],
      })
      setErrors({})
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    setFormData({
      title: "",
      clientId: "",
      type: "",
      status: "Active",
      openDate: new Date().toISOString().split("T")[0],
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Enter the case details to create a new case in the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Case Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Smith v. Johnson"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  clientId: value as NewCase["clientId"],
                })
              }
            >
              <SelectTrigger id="client">
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
            <Label htmlFor="type">Case Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as NewCase["type"] })
              }
            >
              <SelectTrigger id="type">
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
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="openDate">Open Date *</Label>
            <Input
              id="openDate"
              type="date"
              value={formData.openDate}
              onChange={(e) =>
                setFormData({ ...formData, openDate: e.target.value })
              }
              className={errors.openDate ? "border-red-500" : ""}
            />
            {errors.openDate && (
              <p className="text-sm text-red-500">{errors.openDate}</p>
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
          <Button onClick={handleSubmit}>Create Case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
