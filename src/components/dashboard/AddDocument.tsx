"use client"

import { useState } from "react"
import { FileText, Link2, Upload } from "lucide-react"
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
    setSource("file")
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-14">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {isEditing ? "Edit Document" : "Add New Document"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Rename the document or change its client, case, or type."
                  : "Attach a file or a Google Drive / Docs link to a client and case."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          {!isEditing && (
            <div
              className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-1"
              role="radiogroup"
              aria-label="Document source"
            >
              <Button
                type="button"
                role="radio"
                aria-checked={source === "file"}
                variant={source === "file" ? "default" : "ghost"}
                className={`h-10 gap-2 ${
                  source === "file"
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSource("file")}
              >
                <Upload className="size-4" aria-hidden="true" />
                Upload file
              </Button>
              <Button
                type="button"
                role="radio"
                aria-checked={source === "link"}
                variant={source === "link" ? "default" : "ghost"}
                className={`h-10 gap-2 ${
                  source === "link"
                    ? "shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSource("link")}
              >
                <Link2 className="size-4" aria-hidden="true" />
                Google Drive link
              </Button>
            </div>
          )}

          {showNameField && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Document Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter document name"
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
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value || "" })
                }
              >
                <SelectTrigger
                  id="client"
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
              <Label htmlFor="case" className="text-sm font-medium">
                Case <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.caseId}
                onValueChange={(value) =>
                  setFormData({ ...formData, caseId: value || "" })
                }
              >
                <SelectTrigger
                  id="case"
                  aria-invalid={Boolean(errors.caseId)}
                  className="h-10 w-full"
                >
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
                <p className="text-sm text-destructive">{errors.caseId}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Document Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as DocumentRecord["type"],
                })
              }
            >
              <SelectTrigger
                id="type"
                aria-invalid={Boolean(errors.type)}
                className="h-10 w-full"
              >
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
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
          </div>

          {showLinkField && (
            <div className="space-y-2">
              <Label htmlFor="link" className="text-sm font-medium">
                Google Drive / Docs Link <span className="text-destructive">*</span>
              </Label>
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
                className={`h-10 ${errors.link ? "border-destructive" : ""}`}
              />
              {errors.link ? (
                <p className="text-sm text-destructive">{errors.link}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Make sure the file is shared so the firm can open it.
                </p>
              )}
            </div>
          )}

          {!isEditing && source === "file" && (
            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">
                File <span className="text-destructive">*</span>
              </Label>
              <div className="rounded-xl border border-dashed bg-muted/20 p-3">
                <Input
                  id="file"
                  type="file"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      file: e.target.files?.[0] ?? null,
                    })
                  }
                  className={errors.file ? "border-destructive" : ""}
                />
              </div>
              {errors.file && (
                <p className="text-sm text-destructive">{errors.file}</p>
              )}
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
