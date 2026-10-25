import { describe, expect, it } from "vitest"
import type {
  Appointment,
  Case,
  CaseNote,
  Client,
  DocumentRecord,
} from "@/domain/models"
import { getCaseTimeline } from "./derived"

const client: Client = {
  id: "client-1",
  ownerId: "attorney-1",
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  phone: "09123456789",
}

const caseItem: Case = {
  id: "case-1",
  ownerId: "attorney-1",
  title: "Dela Cruz v. Santos",
  clientId: "client-1",
  clientName: "Juan Dela Cruz",
  type: "Civil",
  status: "Active",
  openDate: "2026-10-15",
}

const appointment = (id: string, caseId: string | null, date: string) =>
  ({
    id,
    ownerId: "attorney-1",
    clientId: "client-1",
    caseId,
    type: "Case Review",
    date,
    time: "10:00",
    status: "Scheduled",
    location: "Office",
  }) satisfies Appointment

const document = (id: string, caseId: string, uploadedDate: string) =>
  ({
    id,
    ownerId: "attorney-1",
    name: `Doc ${id}`,
    caseId,
    clientId: "client-1",
    type: "Agreement",
    uploadedDate,
    size: "1.0 MB",
    url: "https://docs.google.com/document/d/x",
    storagePath: "",
  }) satisfies DocumentRecord

const note = (
  id: string,
  createdAt: string,
  links: Partial<CaseNote> = {}
): CaseNote => ({
  id,
  ownerId: "attorney-1",
  caseId: "case-1",
  body: `Note ${id}`,
  authorName: "Atty. Cruz",
  createdAt,
  appointmentIds: [],
  documentIds: [],
  ...links,
})

describe("getCaseTimeline", () => {
  it("merges this case's notes, appointments, documents and opening, newest first", () => {
    const timeline = getCaseTimeline(
      caseItem,
      client,
      [note("n1", "2026-10-25T08:00:00.000Z")],
      [
        appointment("a1", "case-1", "2026-10-24"),
        appointment("a2", "case-2", "2026-10-26"),
      ],
      [
        document("d1", "case-1", "2026-10-20"),
        document("d2", "case-9", "2026-10-21"),
      ]
    )

    expect(timeline.map((item) => `${item.kind}:${item.id}`)).toEqual([
      "note:n1",
      "appointment:a1",
      "document:d1",
      "opened:case-1",
    ])
  })

  it("puts notes before other entries on the same day, newest note first", () => {
    const timeline = getCaseTimeline(
      caseItem,
      client,
      [
        note("early", "2026-10-15T01:00:00.000Z"),
        note("late", "2026-10-15T09:00:00.000Z"),
      ],
      [appointment("a1", "case-1", "2026-10-15")],
      []
    )

    expect(timeline.map((item) => item.id)).toEqual([
      "late",
      "early",
      "a1",
      "case-1",
    ])
  })

  it("resolves a note's linked appointments and documents within the case", () => {
    const [entry] = getCaseTimeline(
      caseItem,
      client,
      [
        note("n1", "2026-10-25T08:00:00.000Z", {
          appointmentIds: ["a1", "missing"],
          documentIds: ["d1", "d-other-case"],
        }),
      ],
      [appointment("a1", "case-1", "2026-10-24")],
      [
        document("d1", "case-1", "2026-10-20"),
        document("d-other-case", "case-2", "2026-10-20"),
      ]
    )

    expect(entry.kind).toBe("note")
    if (entry.kind !== "note") return
    expect(entry.appointments.map((a) => a.id)).toEqual(["a1"])
    expect(entry.documents.map((d) => d.id)).toEqual(["d1"])
  })
})
