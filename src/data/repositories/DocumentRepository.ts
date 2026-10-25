import {
  addDoc,
  collection,
  deleteDoc,
  doc,
} from "firebase/firestore"
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage"
import type { DocumentRecord, DocumentType } from "@/domain/models"
import { parseDocumentRecord } from "@/domain/models/validation"
import { db, storage } from "@/lib/firebase"
import { OwnedFirestoreRepository } from "./OwnedFirestoreRepository"
import { RepositoryError, toRepositoryError } from "./RepositoryError"

export interface NewDocumentMetadata {
  name: string
  caseId: string
  clientId: string
  type: DocumentType
}

export class DocumentRepository extends OwnedFirestoreRepository<DocumentRecord> {
  constructor() {
    super("documents", parseDocumentRecord)
  }

  async upload(
    ownerId: string,
    file: File,
    metadata: NewDocumentMetadata
  ): Promise<void> {
    this.assertOwner(ownerId, "Upload document")
    const documentId = crypto.randomUUID()
    const safeFileName = file.name.replace(/[\\/]/g, "_")
    const storagePath = `documents/${ownerId}/${documentId}/${safeFileName}`
    const storageRef = ref(storage, storagePath)
    let uploaded = false

    try {
      await uploadBytes(storageRef, file)
      uploaded = true
      const url = await getDownloadURL(storageRef)
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1)
      await addDoc(collection(db, "documents"), {
        ...metadata,
        ownerId,
        uploadedDate: new Date().toISOString().split("T")[0],
        size: `${sizeInMb} MB`,
        url,
        storagePath,
      })
    } catch (error) {
      if (uploaded) {
        try {
          await deleteObject(storageRef)
        } catch (cleanupError) {
          throw new RepositoryError(
            "Upload document (storage cleanup also failed)",
            { uploadError: error, cleanupError }
          )
        }
      }
      throw toRepositoryError("Upload document", error)
    }
  }

  async deleteDocument(
    ownerId: string,
    id: string,
    storagePath: string
  ): Promise<void> {
    this.assertOwner(ownerId, "Delete document")
    // Documents are shared firm-wide, so any attorney may delete any file
    // under documents/ (storage.rules enforces the attorney check).
    if (storagePath && !storagePath.startsWith("documents/")) {
      throw new RepositoryError(
        "Delete document",
        new Error("Storage path is outside the documents folder.")
      )
    }

    try {
      if (storagePath) {
        await deleteObject(ref(storage, storagePath))
      }
      await deleteDoc(doc(db, "documents", id))
    } catch (error) {
      throw toRepositoryError("Delete document", error)
    }
  }
}

export const documentRepository = new DocumentRepository()
