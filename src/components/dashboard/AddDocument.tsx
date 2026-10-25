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
import { isGoogleDriveUrl } from "@/domain/models/validation"

import type { DocumentRecord } from "@/domain/models"

interface AddDocumentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // When set, the dialog edits this document's details instead of uploading.
  document?: DocumentRecord
}

const documentTypes: DocumentRecord["type"][] = [
  "Contract",
  "Brief",
  "Invoice",
  "Agreement",
  "Other",
]

interface FormState {
  name: string
  caseId: string
  clientId: string
  type: DocumentRecord["type"] | ""
  file: File | null
  link: string
}

// A document is either an uploaded file or a Google Drive / Docs link.
type DocumentSource = "file" | "link"

const emptyForm: FormState = {
  name: "",
  caseId: "",
  clientId: "",
  type: "",
  file: null,
  link: "",
}

export default function AddDocument({
  open,
  onOpenChange,
  document,
}: AddDocumentProps) {
  const { clients } = useClients()
  const { cases } = useCases()
  const { uploadDocument, addDocumentLink, updateDocument } = useDocuments()
  const isEditing = Boolean(document)
  const isEditingLink = Boolean(
    document && !document.storagePath && isGoogleDriveUrl(document.url)
  )
  const [source, setSource] = useState<DocumentSource>("file")
  const [formData, setFormData] = useState<FormState>(
    document
      ? {
          name: document.name,
          caseId: document.caseId,
          clientId: document.clientId,
          type: document.type,
          file: null,
          link: isEditingLink ? document.url : "",
        }
      : emptyForm
  )
  const showNameField = isEditing || source === "link"
  const showLinkField = isEditing ? isEditingLink : source === "link"
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

    if (showNameField && !formData.name.trim()) {
      newErrors.name = "Document name is required"
    }

    if (showLinkField) {
      if (!formData.link.trim()) {
        newErrors.link = "A Google Drive or Docs link is required"
      } else if (!isGoogleDriveUrl(formData.link)) {
        newErrors.link =
          "Enter a link that starts with https://drive.google.com or https://docs.google.com"
      }
    }

    if (!isEditing && source === "file" && !formData.file) {
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
    if (!validateForm() || !formData.type) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      if (document) {
        await updateDocument(document.id, {
          name: formData.name.trim(),
          caseId: formData.caseId,
          clientId: formData.clientId,
          type: formData.type,
          ...(isEditingLink ? { url: formData.link.trim() } : {}),
        })
        handleReset()
        onOpenChange(false)
        return
      }
      if (source === "link") {
        await addDocumentLink(formData.link, {
          name: formData.name.trim(),
          caseId: formData.caseId,
          clientId: formData.clientId,
          type: formData.type,
        })
        handleReset()
        onOpenChange(false)
        return
      }
      if (!formData.file) return
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
        err instanceof Error
          ? err.message
          : isEditing
            ? "Failed to save document"
            : "Failed to upload document"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Document" : "Upload Document"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Rename the document or change its client, case, or type."
              : "Attach a file or a Google Drive / Docs link to a client and case."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing && (
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Document source"
            >
              <Button
                type="button"
                role="radio"
                aria-checked={source === "file"}
                variant={source === "file" ? "default" : "outline"}
                onClick={() => setSource("file")}
              >
                Upload file
              </Button>
              <Button
                type="button"
                role="radio"
                aria-checked={source === "link"}
                variant={source === "link" ? "default" : "outline"}
                onClick={() => setSource("link")}
              >
                Google Drive link
              </Button>
            </div>
          )}

          {showNameField && (
            <div className="space-y-2">
              <Label htmlFor="name">Document Name *</Label>
              <Input
                id="name"
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
          )}

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

          {showLinkField && (
            <div className="space-y-2">
              <Label htmlFor="link">Google Drive / Docs Link *</Label>
              <Input
                id="link"
                type="url"
                inputMode="url"
                placeholder="https://docs.google.com/document/d/..."
                value={formData.link}
                onChange={(e) =>
                  setFormData({ ...formData, link: e.target.value })
                }
                aria-invalid={Boolean(errors.link)}
                className={errors.link ? "border-red-500" : ""}
              />
              {errors.link ? (
                <p className="text-sm text-red-500">{errors.link}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Make sure the file is shared so the firm can open it.
                </p>
              )}
            </div>
          )}

          {!isEditing && source === "file" && (
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
          )}

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
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
            {isEditing
              ? submitting
                ? "Saving..."
                : "Save Changes"
              : source === "link"
                ? submitting
                  ? "Saving..."
                  : "Add Link"
                : submitting
                  ? "Uploading..."
                  : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
