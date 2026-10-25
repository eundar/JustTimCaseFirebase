import type { Case } from "@/domain/models"
import { parseCase } from "@/domain/models/validation"
import { OwnedFirestoreRepository } from "./OwnedFirestoreRepository"

export class CaseRepository extends OwnedFirestoreRepository<Case> {
  constructor() {
    super("cases", parseCase)
  }
}

export const caseRepository = new CaseRepository()
