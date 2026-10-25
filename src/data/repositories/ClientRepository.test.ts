import { beforeEach, describe, expect, it, vi } from "vitest"

const firebase = vi.hoisted(() => ({
  auth: { currentUser: { uid: "attorney-1" } },
  db: {},
  addDoc: vi.fn(),
  collection: vi.fn((database: unknown, name: string) => ({
    database,
    name,
  })),
  deleteDoc: vi.fn(),
  doc: vi.fn((database: unknown, ...segments: string[]) => ({
    database,
    segments,
  })),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  updateDoc: vi.fn(),
  where: vi.fn((...parts: unknown[]) => ({ where: parts })),
}))

vi.mock("firebase/firestore", () => ({
  addDoc: firebase.addDoc,
  collection: firebase.collection,
  deleteDoc: firebase.deleteDoc,
  doc: firebase.doc,
  getDocs: firebase.getDocs,
  onSnapshot: firebase.onSnapshot,
  query: firebase.query,
  updateDoc: firebase.updateDoc,
  where: firebase.where,
}))

vi.mock("@/lib/firebase", () => ({
  auth: firebase.auth,
  db: firebase.db,
}))

import { clientRepository } from "./ClientRepository"

describe("ClientRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    firebase.auth.currentUser = { uid: "attorney-1" }
    firebase.addDoc.mockResolvedValue({ id: "client-1" })
    firebase.updateDoc.mockResolvedValue(undefined)
    firebase.deleteDoc.mockResolvedValue(undefined)
  })

  it("subscribes to the whole firm-wide collection and parses returned records", () => {
    const onData = vi.fn()
    const onError = vi.fn()
    const unsubscribe = vi.fn()
    let receiveSnapshot:
      | ((snapshot: {
          docs: { id: string; data: () => Record<string, unknown> }[]
        }) => void)
      | undefined
    firebase.onSnapshot.mockImplementation((_query, next) => {
      receiveSnapshot = next
      return unsubscribe
    })

    const stop = clientRepository.subscribe("attorney-1", onData, onError)
    receiveSnapshot?.({
      docs: [
        {
          id: "client-1",
          data: () => ({
            ownerId: "attorney-2",
            name: "Morgan Client",
            email: "morgan@example.com",
            phone: "555-0100",
          }),
        },
      ],
    })

    expect(firebase.where).not.toHaveBeenCalled()
    expect(firebase.onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ name: "clients" }),
      expect.any(Function),
      expect.any(Function)
    )
    expect(onData).toHaveBeenCalledWith([
      {
        id: "client-1",
        ownerId: "attorney-2",
        name: "Morgan Client",
        email: "morgan@example.com",
        phone: "555-0100",
      },
    ])
    expect(onError).not.toHaveBeenCalled()
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it("attaches owner identity to creates and delegates updates/deletes", async () => {
    await clientRepository.create("attorney-1", {
      name: "Morgan Client",
      email: "morgan@example.com",
      phone: "555-0100",
    })
    await clientRepository.update("attorney-1", "client-1", {
      name: "Updated Client",
    })
    await clientRepository.delete("attorney-1", "client-1")

    expect(firebase.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ name: "clients" }),
      {
        name: "Morgan Client",
        email: "morgan@example.com",
        phone: "555-0100",
        ownerId: "attorney-1",
      }
    )
    expect(firebase.updateDoc).toHaveBeenCalledOnce()
    expect(firebase.deleteDoc).toHaveBeenCalledOnce()
  })

  it("rejects operations requested for another authenticated owner", async () => {
    await expect(
      clientRepository.list("attorney-2")
    ).rejects.toThrow("Authenticated owner does not match")
    expect(firebase.getDocs).not.toHaveBeenCalled()
  })

  it("skips malformed Firestore records instead of failing the whole list", () => {
    const onData = vi.fn()
    const onError = vi.fn()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    firebase.onSnapshot.mockImplementation((_query, next) => {
      next({
        docs: [
          {
            id: "bad-client",
            data: () => ({ ownerId: "attorney-1", name: 32 }),
          },
          {
            id: "good-client",
            data: () => ({
              ownerId: "attorney-2",
              name: "Morgan Client",
              email: "morgan@example.com",
              phone: "555-0100",
            }),
          },
        ],
      })
      return vi.fn()
    })

    clientRepository.subscribe("attorney-1", onData, onError)
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: "good-client" }),
    ])
    expect(onError).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      "Skipping invalid clients/bad-client:",
      expect.stringContaining("name")
    )
    warn.mockRestore()
  })

  it("logs and reports Firestore listener errors", () => {
    const onError = vi.fn()
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    firebase.onSnapshot.mockImplementation((_query, _next, fail) => {
      fail(new Error("Missing or insufficient permissions."))
      return vi.fn()
    })

    clientRepository.subscribe("attorney-1", vi.fn(), onError)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "Subscribe to clients" })
    )
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining("Missing or insufficient permissions"),
      expect.any(Error)
    )
    logged.mockRestore()
  })
})
