import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
} from "firebase/firestore"
import type { ProspectiveClient } from "@/domain/models"
import { parseProspectiveClient } from "@/domain/models/validation"
import { auth, db } from "@/lib/firebase"
import { RepositoryError, toRepositoryError } from "./RepositoryError"

export type NewProspectiveClient = Omit<
  ProspectiveClient,
  "id" | "status" | "createdAt"
>

export class ProspectiveClientRepository {
  // Every attorney (anyone with an attorneys/{uid} profile) can review intakes.
  private async requireReviewer(operation: string): Promise<void> {
    const user = auth.currentUser
    if (!user) {
      throw new RepositoryError(
        operation,
        new Error("An authenticated attorney is required.")
      )
    }

    try {
      const profile = await getDoc(doc(db, "attorneys", user.uid))
      if (!profile.exists()) {
        throw new Error("This account does not have an attorney profile.")
      }
    } catch (error) {
      throw toRepositoryError(operation, error)
    }
  }

  subscribe(
    onData: (records: ProspectiveClient[]) => void,
    onError: (error: RepositoryError) => void
  ): () => void {
    let cancelled = false
    let unsubscribe = () => {}
    void this.requireReviewer("Subscribe to prospective clients")
      .then(() => {
        if (cancelled) return
        unsubscribe = onSnapshot(
          query(
            collection(db, "prospectiveClients"),
            orderBy("createdAt", "desc")
          ),
          (snapshot) => {
            try {
              onData(
                snapshot.docs.map((item) =>
                  parseProspectiveClient(item.id, item.data())
                )
              )
            } catch (error) {
              onError(toRepositoryError("Parse prospective clients", error))
            }
          },
          (error) =>
            onError(toRepositoryError("Subscribe to prospective clients", error))
        )
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onError(toRepositoryError("Authorize intake review", error))
        }
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }

  async listForReview(): Promise<ProspectiveClient[]> {
    await this.requireReviewer("List prospective clients")
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "prospectiveClients"),
          orderBy("createdAt", "desc")
        )
      )
      return snapshot.docs.map((item) =>
        parseProspectiveClient(item.id, item.data())
      )
    } catch (error) {
      throw toRepositoryError("List prospective clients", error)
    }
  }

  async getForReview(id: string): Promise<ProspectiveClient> {
    await this.requireReviewer("Read prospective client")
    try {
      const snapshot = await getDoc(doc(db, "prospectiveClients", id))
      if (!snapshot.exists()) {
        throw new Error("Prospective client not found.")
      }
      return parseProspectiveClient(snapshot.id, snapshot.data())
    } catch (error) {
      throw toRepositoryError("Read prospective client", error)
    }
  }

  async createPublic(data: NewProspectiveClient): Promise<string> {
    try {
      const created = await addDoc(collection(db, "prospectiveClients"), {
        ...data,
        status: "Pending Review",
        createdAt: new Date().toISOString(),
      })
      return created.id
    } catch (error) {
      throw toRepositoryError("Submit prospective client intake", error)
    }
  }

  async accept(id: string, ownerId: string): Promise<string> {
    await this.requireReviewer("Accept prospective client")
    if (auth.currentUser?.uid !== ownerId) {
      throw new RepositoryError(
        "Accept prospective client",
        new Error("Authenticated owner does not match the requested owner.")
      )
    }
    try {
      const intakeRef = doc(db, "prospectiveClients", id)
      const clientRef = doc(collection(db, "clients"))
      return await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(intakeRef)
        if (!snapshot.exists()) {
          throw new Error("Prospective client not found.")
        }

        const intake = parseProspectiveClient(snapshot.id, snapshot.data())
        if (intake.status !== "Pending Review") {
          throw new Error("Prospective client has already been processed.")
        }

        transaction.set(clientRef, {
          ownerId,
          name: intake.fullName,
          email: intake.email,
          phone: intake.phone,
        })
        transaction.update(intakeRef, { status: "Accepted" })
        return clientRef.id
      })
    } catch (error) {
      throw toRepositoryError("Accept prospective client", error)
    }
  }

  async decline(id: string): Promise<void> {
    await this.requireReviewer("Decline prospective client")
    try {
      const intakeRef = doc(db, "prospectiveClients", id)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(intakeRef)
        if (!snapshot.exists()) {
          throw new Error("Prospective client not found.")
        }
        const intake = parseProspectiveClient(snapshot.id, snapshot.data())
        if (intake.status !== "Pending Review") {
          throw new Error("Prospective client has already been processed.")
        }
        transaction.update(intakeRef, { status: "Declined" })
      })
    } catch (error) {
      throw toRepositoryError("Decline prospective client", error)
    }
  }
}

export const prospectiveClientRepository = new ProspectiveClientRepository()
