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
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useDocuments } from "@/hooks/useDocuments"

import type { DocumentRecord } from "@/types/models"

interface AddDocumentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const documentTypes: DocumentRecord["type"][] = [
  "Contract",
  "Brief",
  "Invoice",
  "Agreement",
  "Other",
]

interface FormState {
  caseId: string
  clientId: string
  type: DocumentRecord["type"] | ""
  file: File | null
}

const emptyForm: FormState = {
  caseId: "",
  clientId: "",
  type: "",
  file: null,
}

export default function AddDocument({
  open,
  onOpenChange,
}: AddDocumentProps) {
  const { clients } = useClients()
  const { cases } = useCases()
  const { uploadDocument } = useDocuments()
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!formData.clientId) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.caseId) {
      newErrors.caseId = "Case is required"
    }

    if (!formData.type) {
      newErrors.type = "Document type is required"
    }

    if (!formData.file) {
      newErrors.file = "A file is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleReset = () => {
    setFormData(emptyForm)
    setErrors({})
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!validateForm() || !formData.file || !formData.type) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await uploadDocument(formData.file, {
        name: formData.file.name,
        caseId: formData.caseId,
        clientId: formData.clientId,
        type: formData.type,
      })
      handleReset()
      onOpenChange(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to upload document"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Attach a file to a client and case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value || "" })
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
            <Label htmlFor="case">Case *</Label>
            <Select
              value={formData.caseId}
              onValueChange={(value) =>
                setFormData({ ...formData, caseId: value || "" })
              }
            >
              <SelectTrigger id="case">
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((caseItem) => (
                  <SelectItem key={caseItem.id} value={caseItem.id}>
                    {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.caseId && (
              <p className="text-sm text-red-500">{errors.caseId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Document Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as DocumentRecord["type"],
                })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
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
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  file: e.target.files?.[0] ?? null,
                })
              }
              className={errors.file ? "border-red-500" : ""}
            />
            {errors.file && (
              <p className="text-sm text-red-500">{errors.file}</p>
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
            {submitting ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
