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
  type Query,
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

    // Records are shared firm-wide, so every attorney sees the whole collection.
    return this.listen(collection(db, this.collectionName), onData, onError)
  }

  // Subscribes to the records whose `field` equals `value` (e.g. one case's notes).
  subscribeWhere(
    ownerId: string,
    field: string,
    value: string,
    onData: (records: T[]) => void,
    onError: (error: RepositoryError) => void
  ): () => void {
    this.assertOwner(ownerId, `Subscribe to ${this.collectionName}`)
    return this.listen(
      query(collection(db, this.collectionName), where(field, "==", value)),
      onData,
      onError
    )
  }

  private listen(
    source: Query<DocumentData>,
    onData: (records: T[]) => void,
    onError: (error: RepositoryError) => void
  ): () => void {
    return onSnapshot(
      source,
      (snapshot) => onData(this.parseValidRecords(snapshot.docs)),
      (error) => {
        const repositoryError = toRepositoryError(
          `Subscribe to ${this.collectionName}`,
          error
        )
        console.error(repositoryError.message, error)
        onError(repositoryError)
      }
    )
  }

  // One malformed record must not hide the rest of the firm's data, so invalid
  // records are skipped (and logged) instead of failing the whole collection.
  private parseValidRecords(
    docs: { id: string; data: () => DocumentData }[]
  ): T[] {
    return docs.flatMap((item) => {
      try {
        return [this.parseRecord(item.id, item.data())]
      } catch (error) {
        console.warn(
          `Skipping invalid ${this.collectionName}/${item.id}:`,
          error instanceof Error ? error.message : error
        )
        return []
      }
    })
  }

  async list(ownerId: string): Promise<T[]> {
    this.assertOwner(ownerId, `List ${this.collectionName}`)
    try {
      const snapshot = await getDocs(collection(db, this.collectionName))
      return this.parseValidRecords(snapshot.docs)
    } catch (error) {
      throw toRepositoryError(`List ${this.collectionName}`, error)
    }
  }

  async create(ownerId: string, data: NewOwnedRecord<T>): Promise<string> {
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
