import { describe, expect, it, vi } from "vitest"
import { IntakeService } from "./IntakeService"
import type { ProspectiveClient } from "@/domain/models"

function createIntake(
  overrides: Partial<ProspectiveClient> = {}
): ProspectiveClient {
  return {
    id: "intake-1",
    fullName: "Avery Client",
    email: "avery@example.com",
    phone: "555-0100",
    caseType: "Civil",
    caseDescription: "A contract dispute",
    privacyAgreementAccepted: true,
    status: "Pending Review",
    createdAt: "2026-10-24T00:00:00.000Z",
    ...overrides,
  }
}

describe("IntakeService", () => {
  it("delegates acceptance and decline to the intake repository", async () => {
    const accept = vi.fn().mockResolvedValue("client-1")
    const decline = vi.fn().mockResolvedValue(undefined)
    const service = new IntakeService({
      clients: { list: vi.fn() },
      intakes: {
        createPublic: vi.fn(),
        accept,
        decline,
        getForReview: vi.fn(),
        listForReview: vi.fn(),
      },
    })

    await expect(service.accept("intake-1", "attorney-1")).resolves.toBe(
      "client-1"
    )
    await expect(service.decline("intake-2")).resolves.toBeUndefined()
    expect(accept).toHaveBeenCalledWith("intake-1", "attorney-1")
    expect(decline).toHaveBeenCalledWith("intake-2")
  })

  it("checks normalized parties against owned clients and other intakes", async () => {
    const intake = createIntake({
      opposingParty: "Example Corp",
    })
    const service = new IntakeService({
      clients: {
        list: vi.fn().mockResolvedValue([
          {
            id: "client-1",
            ownerId: "attorney-1",
            name: " aVeRy cLiEnT ",
            email: "avery@example.com",
            phone: "555-0100",
          },
        ]),
      },
      intakes: {
        createPublic: vi.fn(),
        accept: vi.fn(),
        decline: vi.fn(),
        getForReview: vi.fn().mockResolvedValue(intake),
        listForReview: vi.fn().mockResolvedValue([
          intake,
          createIntake({
            id: "intake-2",
            fullName: "Example Corp",
            opposingParty: "Other Party",
          }),
        ]),
      },
    })

    await expect(
      service.checkConflict("attorney-1", "intake-1")
    ).resolves.toEqual({
      hasPotentialConflict: true,
      matches: [
        expect.objectContaining({
          matchedName: "aVeRy cLiEnT",
          source: "Existing Client",
        }),
        expect.objectContaining({
          matchedName: "Example Corp",
          source: "Other Intake",
        }),
      ],
    })
  })
})
