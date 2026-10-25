import type { CaseNote } from "@/domain/models"
import { parseCaseNote } from "@/domain/models/validation"
import { OwnedFirestoreRepository } from "./OwnedFirestoreRepository"
import type { RepositoryError } from "./RepositoryError"

export class CaseNoteRepository extends OwnedFirestoreRepository<CaseNote> {
  constructor() {
    super("caseNotes", parseCaseNote)
  }

  subscribeToCase(
    ownerId: string,
    caseId: string,
    onData: (records: CaseNote[]) => void,
    onError: (error: RepositoryError) => void
  ): () => void {
    return this.subscribeWhere(ownerId, "caseId", caseId, onData, onError)
  }
}

export const caseNoteRepository = new CaseNoteRepository()
