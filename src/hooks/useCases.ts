import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { Case } from "@/domain/models"
import { caseRepository } from "@/data/repositories/CaseRepository"
import { RepositoryError } from "@/data/repositories/RepositoryError"

export function useCases() {
  const { user } = useAuth()
  const userId = user?.uid
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCases([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const unsubscribe = caseRepository.subscribe(
      userId,
      (records) => {
        setCases(records)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [userId])

  const addCase = async (caseData: Omit<Case, "id" | "ownerId">) => {
    if (!userId) throw new RepositoryError("Create case", new Error("Not authenticated"))
    await caseRepository.create(userId, caseData)
  }

  const updateCase = async (
    id: string,
    updates: Partial<Omit<Case, "id" | "ownerId">>
  ) => {
    if (!userId) throw new RepositoryError("Update case", new Error("Not authenticated"))
    await caseRepository.update(userId, id, updates)
  }

  const deleteCase = async (id: string) => {
    if (!userId) throw new RepositoryError("Delete case", new Error("Not authenticated"))
    await caseRepository.delete(userId, id)
  }

  return { cases, loading, error, addCase, updateCase, deleteCase }
}
