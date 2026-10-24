import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { DocumentRecord } from "@/domain/models"
import {
  documentRepository,
  type NewDocumentMetadata,
} from "@/data/repositories/DocumentRepository"
import { RepositoryError } from "@/data/repositories/RepositoryError"

export function useDocuments() {
  const { user } = useAuth()
  const userId = user?.uid
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocuments([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const unsubscribe = documentRepository.subscribe(
      userId,
      (records) => {
        setDocuments(records)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [userId])

  const uploadDocument = async (
    file: File,
    metadata: NewDocumentMetadata
  ) => {
    if (!userId) throw new RepositoryError("Upload document", new Error("Not authenticated"))
    await documentRepository.upload(userId, file, metadata)
  }

  const deleteDocument = async (id: string, storagePath: string) => {
    if (!userId) throw new RepositoryError("Delete document", new Error("Not authenticated"))
    await documentRepository.deleteDocument(userId, id, storagePath)
  }

  return { documents, loading, error, uploadDocument, deleteDocument }
}
