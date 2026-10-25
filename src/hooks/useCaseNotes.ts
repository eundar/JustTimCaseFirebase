import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { CaseNote } from "@/domain/models"
import { caseNoteRepository } from "@/data/repositories/CaseNoteRepository"
import { RepositoryError } from "@/data/repositories/RepositoryError"

export interface CaseNoteInput {
  body: string
  appointmentIds: string[]
  documentIds: string[]
}

export function useCaseNotes(caseId: string) {
  const { user, attorneyProfile } = useAuth()
  const userId = user?.uid
  const [notes, setNotes] = useState<CaseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotes([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const unsubscribe = caseNoteRepository.subscribeToCase(
      userId,
      caseId,
      (records) => {
        setNotes(records)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [userId, caseId])

  const addNote = async (note: CaseNoteInput) => {
    if (!userId)
      throw new RepositoryError(
        "Create case note",
        new Error("Not authenticated")
      )
    await caseNoteRepository.create(userId, {
      ...note,
      caseId,
      authorName: attorneyProfile?.name ?? user?.email ?? "",
      createdAt: new Date().toISOString(),
    })
  }

  const updateNote = async (id: string, note: CaseNoteInput) => {
    if (!userId)
      throw new RepositoryError(
        "Update case note",
        new Error("Not authenticated")
      )
    await caseNoteRepository.update(userId, id, {
      ...note,
      updatedAt: new Date().toISOString(),
    })
  }

  const deleteNote = async (id: string) => {
    if (!userId)
      throw new RepositoryError(
        "Delete case note",
        new Error("Not authenticated")
      )
    await caseNoteRepository.delete(userId, id)
  }

  return { notes, loading, error, addNote, updateNote, deleteNote }
}
