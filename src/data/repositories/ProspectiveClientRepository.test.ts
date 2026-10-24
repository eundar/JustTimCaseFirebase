import { beforeEach, describe, expect, it, vi } from "vitest"

const firebase = vi.hoisted(() => ({
  auth: {
    currentUser: {
      uid: "attorney-1",
      getIdTokenResult: vi.fn(),
    },
  },
  db: {},
  collection: vi.fn((_database: unknown, name: string) => ({ name })),
  doc: vi.fn((_database: unknown, ...segments: string[]) => ({ segments })),
  getDocs: vi.fn(),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  orderBy: vi.fn((...parts: unknown[]) => ({ orderBy: parts })),
}))

vi.mock("firebase/firestore", () => ({
  collection: firebase.collection,
  doc: firebase.doc,
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
    firebase.auth.currentUser.getIdTokenResult.mockResolvedValue({
      claims: { intakeReviewer: false },
    })
  })

  it("denies review reads without the trusted reviewer claim", async () => {
    await expect(
      prospectiveClientRepository.listForReview()
    ).rejects.toThrow("not been approved")
    expect(firebase.getDocs).not.toHaveBeenCalled()
  })

  it("loads review records only after the reviewer claim is present", async () => {
    firebase.auth.currentUser.getIdTokenResult.mockResolvedValue({
      claims: { intakeReviewer: true },
    })
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
    expect(firebase.getDocs).toHaveBeenCalledOnce()
  })
})
