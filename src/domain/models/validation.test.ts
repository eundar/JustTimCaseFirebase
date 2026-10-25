import { describe, expect, it } from "vitest"
import { isGoogleDriveUrl, parseCase } from "./validation"

describe("isGoogleDriveUrl", () => {
  it("accepts Google Drive and Docs links", () => {
    expect(
      isGoogleDriveUrl("https://drive.google.com/file/d/abc123/view")
    ).toBe(true)
    expect(
      isGoogleDriveUrl("  https://docs.google.com/document/d/abc123/edit  ")
    ).toBe(true)
  })

  it("rejects other hosts, look-alikes, plain http, and non-URLs", () => {
    expect(isGoogleDriveUrl("https://example.com/doc")).toBe(false)
    expect(isGoogleDriveUrl("https://drive.google.com.evil.com/x")).toBe(false)
    expect(isGoogleDriveUrl("http://drive.google.com/file/d/abc")).toBe(false)
    expect(isGoogleDriveUrl("javascript:alert(1)")).toBe(false)
    expect(isGoogleDriveUrl("not a url")).toBe(false)
  })
})

const baseCase = {
  ownerId: "attorney-1",
  title: "Smith v. Johnson",
  clientId: "client-1",
  type: "Civil",
  status: "Active",
  openDate: "2026-10-24",
}

describe("parseCase", () => {
  it("accepts cases saved with an empty clientName", () => {
    expect(
      parseCase("case-1", { ...baseCase, clientName: "" }).clientName
    ).toBe("")
  })

  it("accepts legacy cases saved without a clientName", () => {
    expect(parseCase("case-1", baseCase).clientName).toBe("")
  })

  it("keeps a stored clientName", () => {
    expect(
      parseCase("case-1", { ...baseCase, clientName: "Jane Smith" }).clientName
    ).toBe("Jane Smith")
  })
})
