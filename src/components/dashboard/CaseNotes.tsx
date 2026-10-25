"use client"

import { useState } from "react"
import {
  Briefcase,
  Calendar,
  CornerDownRight,
  FileText,
  NotebookPen,
  Plus,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type {
  Appointment,
  Case,
  CaseNote,
  Client,
  DocumentRecord,
} from "@/domain/models"
import { useCaseNotes, type CaseNoteInput } from "@/hooks/useCaseNotes"
import { getCaseTimeline, type CaseTimelineItem } from "@/lib/derived"

interface CaseNotesProps {
  caseItem: Case
  client: Client | undefined
  appointments: Appointment[]
  documents: DocumentRecord[]
}

const MAX_NOTE_LENGTH = 5000

function formatNoteDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

export function CaseNotes({
  caseItem,
  client,
  appointments,
  documents,
}: CaseNotesProps) {
  const { notes, loading, error, addNote, updateNote, deleteNote } =
    useCaseNotes(caseItem.id)
  const [adding, setAdding] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const caseAppointments = appointments.filter((a) => a.caseId === caseItem.id)
  const caseDocuments = documents.filter((d) => d.caseId === caseItem.id)
  const timeline = getCaseTimeline(
    caseItem,
    client,
    notes,
    appointments,
    documents
  )

  const handleDelete = async (id: string) => {
    setActionError(null)
    try {
      await deleteNote(id)
      setConfirmDeleteId(null)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete note"
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4" />
              Case Notes
            </CardTitle>
            <CardDescription>
              Notes, appointments, and documents for this case, newest first
            </CardDescription>
          </div>
          {!adding && (
            <Button
              size="sm"
              onClick={() => {
                setAdding(true)
                setEditingNoteId(null)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add note
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {adding && (
          <NoteForm
            appointments={caseAppointments}
            documents={caseDocuments}
            submitLabel="Add note"
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              await addNote(input)
              setAdding(false)
            }}
          />
        )}

        {actionError && (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}

        {error ? (
          <p className="text-sm text-destructive">
            Failed to load case notes. Please try again later.
          </p>
        ) : loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ol className="relative space-y-4 border-l pl-6">
            {timeline.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="relative">
                <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-background bg-primary" />
                {item.kind === "note" && editingNoteId === item.note.id ? (
                  <NoteForm
                    initial={item.note}
                    appointments={caseAppointments}
                    documents={caseDocuments}
                    submitLabel="Save changes"
                    onCancel={() => setEditingNoteId(null)}
                    onSubmit={async (input) => {
                      await updateNote(item.note.id, input)
                      setEditingNoteId(null)
                    }}
                  />
                ) : (
                  <TimelineEntry
                    item={item}
                    confirmingDelete={
                      item.kind === "note" && confirmDeleteId === item.note.id
                    }
                    onEdit={() => {
                      setEditingNoteId(item.id)
                      setAdding(false)
                    }}
                    onAskDelete={() => setConfirmDeleteId(item.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onDelete={() => handleDelete(item.id)}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

interface TimelineEntryProps {
  item: CaseTimelineItem
  confirmingDelete: boolean
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function TimelineEntry({
  item,
  confirmingDelete,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: TimelineEntryProps) {
  switch (item.kind) {
    case "note":
      return (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge>Note</Badge>
              <span>{formatNoteDate(item.note.createdAt)}</span>
              {item.note.authorName && <span>· {item.note.authorName}</span>}
              {item.note.updatedAt && <span>· edited</span>}
            </div>
            <div className="flex gap-1">
              {confirmingDelete ? (
                <>
                  <Button variant="delete" size="sm" onClick={onDelete}>
                    Confirm delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onAskDelete}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap">{item.note.body}</p>
          {(item.appointments.length > 0 || item.documents.length > 0) && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {item.appointments.map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-1">
                  <CornerDownRight className="h-3 w-3" />
                  Appointment: {appointment.type} ({appointment.date})
                </li>
              ))}
              {item.documents.map((document) => (
                <li key={document.id} className="flex items-center gap-1">
                  <CornerDownRight className="h-3 w-3" />
                  Document:{" "}
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {document.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    case "appointment":
      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              <Calendar className="mr-1 h-3 w-3" />
              Appointment
            </Badge>
            <span>
              {item.appointment.date} at {item.appointment.time}
            </span>
            <Badge variant="secondary">{item.appointment.status}</Badge>
          </div>
          <p className="text-sm">
            {item.appointment.type} · {item.appointment.location}
          </p>
        </div>
      )
    case "document":
      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              <FileText className="mr-1 h-3 w-3" />
              Document
            </Badge>
            <span>{item.document.uploadedDate}</span>
          </div>
          <p className="text-sm">
            <a
              href={item.document.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {item.document.name}
            </a>{" "}
            <span className="text-muted-foreground">
              ({item.document.type})
            </span>
          </p>
        </div>
      )
    case "opened":
      return (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              <Briefcase className="mr-1 h-3 w-3" />
              Case opened
            </Badge>
            <span>{item.caseItem.openDate}</span>
          </div>
          <p className="text-sm">
            Client: {item.client?.name ?? "N/A"}
            {item.client?.email && (
              <span className="text-muted-foreground">
                {" "}
                · {item.client.email}
              </span>
            )}
          </p>
        </div>
      )
  }
}

interface NoteFormProps {
  initial?: CaseNote
  appointments: Appointment[]
  documents: DocumentRecord[]
  submitLabel: string
  onSubmit: (input: CaseNoteInput) => Promise<void>
  onCancel: () => void
}

function NoteForm({
  initial,
  appointments,
  documents,
  submitLabel,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [body, setBody] = useState(initial?.body ?? "")
  const [appointmentIds, setAppointmentIds] = useState<string[]>(
    initial?.appointmentIds ?? []
  )
  const [documentIds, setDocumentIds] = useState<string[]>(
    initial?.documentIds ?? []
  )
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const toggle = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]

  const handleSubmit = async () => {
    if (!body.trim()) {
      setFormError("Write something before saving the note.")
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmit({ body: body.trim(), appointmentIds, documentIds })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save note")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="case-note-body">Note</Label>
        <Textarea
          id="case-note-body"
          placeholder="What happened on this case?"
          value={body}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(formError)}
          className="min-h-24"
        />
      </div>

      {appointments.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Related appointments</legend>
          {appointments.map((appointment) => (
            <label
              key={appointment.id}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={appointmentIds.includes(appointment.id)}
                onChange={() =>
                  setAppointmentIds(toggle(appointmentIds, appointment.id))
                }
              />
              {appointment.type} · {appointment.date} at {appointment.time}
            </label>
          ))}
        </fieldset>
      )}

      {documents.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Related documents</legend>
          {documents.map((document) => (
            <label
              key={document.id}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={documentIds.includes(document.id)}
                onChange={() =>
                  setDocumentIds(toggle(documentIds, document.id))
                }
              />
              {document.name}
            </label>
          ))}
        </fieldset>
      )}

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  )
}
