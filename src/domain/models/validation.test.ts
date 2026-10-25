import { describe, expect, it } from "vitest"
import { parseCase } from "./validation"

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
    expect(parseCase("case-1", { ...baseCase, clientName: "" }).clientName).toBe(
      ""
    )
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
