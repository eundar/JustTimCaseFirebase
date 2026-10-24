import type {
  ConflictCheckResult,
  ConflictMatch,
  ProspectiveClient,
} from "@/domain/models"
import { clientRepository } from "@/data/repositories/ClientRepository"
import {
  prospectiveClientRepository,
  type NewProspectiveClient,
} from "@/data/repositories/ProspectiveClientRepository"

type ClientRepositoryContract = Pick<typeof clientRepository, "list">
type IntakeRepositoryContract = Pick<
  typeof prospectiveClientRepository,
  "createPublic" | "accept" | "decline" | "getForReview" | "listForReview"
>

interface IntakeServiceDependencies {
  clients: ClientRepositoryContract
  intakes: IntakeRepositoryContract
}

export class IntakeService {
  private readonly dependencies: IntakeServiceDependencies

  constructor(dependencies: IntakeServiceDependencies = {
    clients: clientRepository,
    intakes: prospectiveClientRepository,
  }) {
    this.dependencies = dependencies
  }

  submit(data: NewProspectiveClient): Promise<string> {
    return this.dependencies.intakes.createPublic(data)
  }

  accept(id: string, ownerId: string): Promise<string> {
    return this.dependencies.intakes.accept(id, ownerId)
  }

  decline(id: string): Promise<void> {
    return this.dependencies.intakes.decline(id)
  }

  async checkConflict(
    ownerId: string,
    prospectiveClientId: string
  ): Promise<ConflictCheckResult> {
    const [intake, clients, intakes] = await Promise.all([
      this.dependencies.intakes.getForReview(prospectiveClientId),
      this.dependencies.clients.list(ownerId),
      this.dependencies.intakes.listForReview(),
    ])

    const namesToCheck = [intake.fullName, intake.opposingParty ?? ""]
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)
    const matches: ConflictMatch[] = []

    clients.forEach((client) => {
      if (namesToCheck.includes(client.name.trim().toLowerCase())) {
        matches.push({
          matchedName: client.name.trim(),
          source: "Existing Client",
          description: "A name matches an existing client record.",
        })
      }
    })

    intakes.forEach((otherIntake: ProspectiveClient) => {
      if (otherIntake.id === prospectiveClientId) return
      const otherNames = [otherIntake.fullName, otherIntake.opposingParty]
        .filter((name): name is string => Boolean(name?.trim()))
        .map((name) => name.trim())
      const match = otherNames.find((name) =>
        namesToCheck.includes(name.toLowerCase())
      )
      if (match) {
        matches.push({
          matchedName: match,
          source: "Other Intake",
          description: "A name matches a party in another intake submission.",
        })
      }
    })

    return { hasPotentialConflict: matches.length > 0, matches }
  }
}

export const intakeService = new IntakeService()
