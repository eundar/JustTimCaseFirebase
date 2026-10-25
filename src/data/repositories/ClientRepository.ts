import type { Client } from "@/domain/models"
import { parseClient } from "@/domain/models/validation"
import { OwnedFirestoreRepository } from "./OwnedFirestoreRepository"

export class ClientRepository extends OwnedFirestoreRepository<Client> {
  constructor() {
    super("clients", parseClient)
  }
}

export const clientRepository = new ClientRepository()
