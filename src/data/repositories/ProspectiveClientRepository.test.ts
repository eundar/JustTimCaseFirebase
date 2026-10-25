import { beforeEach, describe, expect, it, vi } from "vitest"

const firebase = vi.hoisted(() => ({
  auth: {
    currentUser: {
      uid: "attorney-1",
    },
  },
  db: {},
  collection: vi.fn((_database: unknown, name: string) => ({ name })),
  doc: vi.fn((_database: unknown, ...segments: string[]) => ({ segments })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  orderBy: vi.fn((...parts: unknown[]) => ({ orderBy: parts })),
}))

vi.mock("firebase/firestore", () => ({
  collection: firebase.collection,
  doc: firebase.doc,
  getDoc: firebase.getDoc,
  getDocs: firebase.getDocs,
  query: firebase.query,
  orderBy: firebase.orderBy,
}))

vi.mock("@/lib/firebase", () => ({
  auth: firebase.auth,
  db: firebase.db,
}))

import { prospectiveClientRepository } from "./ProspectiveClientRepository"

describe("ProspectiveClientRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    firebase.getDoc.mockResolvedValue({ exists: () => false })
  })

  it("denies review reads to accounts without an attorney profile", async () => {
    await expect(
      prospectiveClientRepository.listForReview()
    ).rejects.toThrow("does not have an attorney profile")
    expect(firebase.getDocs).not.toHaveBeenCalled()
  })

  it("loads review records for any attorney", async () => {
    firebase.getDoc.mockResolvedValue({ exists: () => true })
    firebase.getDocs.mockResolvedValue({
      docs: [
        {
          id: "intake-1",
          data: () => ({
            fullName: "Avery Client",
            email: "avery@example.com",
            phone: "555-0100",
            caseType: "Civil",
            caseDescription: "A contract dispute",
            privacyAgreementAccepted: true,
            status: "Pending Review",
            createdAt: "2026-10-24T00:00:00.000Z",
          }),
        },
      ],
    })

    await expect(prospectiveClientRepository.listForReview()).resolves.toEqual([
      {
        id: "intake-1",
        fullName: "Avery Client",
        email: "avery@example.com",
        phone: "555-0100",
        caseType: "Civil",
        caseDescription: "A contract dispute",
        privacyAgreementAccepted: true,
        status: "Pending Review",
        createdAt: "2026-10-24T00:00:00.000Z",
      },
    ])
    expect(firebase.doc).toHaveBeenCalledWith(
      firebase.db,
      "attorneys",
      "attorney-1"
    )
    expect(firebase.getDocs).toHaveBeenCalledOnce()
  })
})
