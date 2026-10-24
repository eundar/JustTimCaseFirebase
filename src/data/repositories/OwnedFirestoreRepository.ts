import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { RepositoryError, toRepositoryError } from "./RepositoryError"

export interface OwnedRecord {
  id: string
  ownerId: string
}

export type NewOwnedRecord<T extends OwnedRecord> = Omit<T, "id" | "ownerId">
export type OwnedRecordUpdate<T extends OwnedRecord> = Partial<
  NewOwnedRecord<T>
>
export type RecordParser<T> = (id: string, value: unknown) => T

export abstract class OwnedFirestoreRepository<T extends OwnedRecord> {
  private readonly collectionName: string
  private readonly parseRecord: RecordParser<T>

  protected constructor(collectionName: string, parseRecord: RecordParser<T>) {
    this.collectionName = collectionName
    this.parseRecord = parseRecord
  }

  protected assertOwner(ownerId: string, operation: string): void {
    if (!ownerId || auth.currentUser?.uid !== ownerId) {
      throw new RepositoryError(
        operation,
        new Error("Authenticated owner does not match the requested owner.")
      )
    }
  }

  subscribe(
    ownerId: string,
    onData: (records: T[]) => void,
    onError: (error: RepositoryError) => void
  ): () => void {
    this.assertOwner(ownerId, `Subscribe to ${this.collectionName}`)
    const ownedQuery = query(
      collection(db, this.collectionName),
      where("ownerId", "==", ownerId)
    )

    return onSnapshot(
      ownedQuery,
      (snapshot) => {
        try {
          onData(
            snapshot.docs.map((item) =>
              this.parseRecord(item.id, item.data())
            )
          )
        } catch (error) {
          onError(toRepositoryError(`Parse ${this.collectionName}`, error))
        }
      },
      (error) =>
        onError(toRepositoryError(`Subscribe to ${this.collectionName}`, error))
    )
  }

  async list(ownerId: string): Promise<T[]> {
    this.assertOwner(ownerId, `List ${this.collectionName}`)
    try {
      const snapshot = await getDocs(
        query(
          collection(db, this.collectionName),
          where("ownerId", "==", ownerId)
        )
      )
      return snapshot.docs.map((item) =>
        this.parseRecord(item.id, item.data())
      )
    } catch (error) {
      throw toRepositoryError(`List ${this.collectionName}`, error)
    }
  }

  async create(
    ownerId: string,
    data: NewOwnedRecord<T>
  ): Promise<string> {
    this.assertOwner(ownerId, `Create ${this.collectionName}`)
    try {
      const created = await addDoc(collection(db, this.collectionName), {
        ...data,
        ownerId,
      } as DocumentData)
      return created.id
    } catch (error) {
      throw toRepositoryError(`Create ${this.collectionName}`, error)
    }
  }

  async update(
    ownerId: string,
    id: string,
    updates: OwnedRecordUpdate<T>
  ): Promise<void> {
    this.assertOwner(ownerId, `Update ${this.collectionName}`)
    try {
      await updateDoc(doc(db, this.collectionName, id), updates as DocumentData)
    } catch (error) {
      throw toRepositoryError(`Update ${this.collectionName}`, error)
    }
  }

  async delete(ownerId: string, id: string): Promise<void> {
    this.assertOwner(ownerId, `Delete ${this.collectionName}`)
    try {
      await deleteDoc(doc(db, this.collectionName, id))
    } catch (error) {
      throw toRepositoryError(`Delete ${this.collectionName}`, error)
    }
  }
}
