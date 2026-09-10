import { useEffect, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import type { Case } from "@/types/models"

export function useCases() {
  const { user } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCases([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      collection(db, "cases"),
      (snapshot) => {
        setCases(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Case))
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [user])

  const addCase = async (caseData: Omit<Case, "id" | "ownerId">) => {
    if (!user) throw new Error("Not authenticated")
    await addDoc(collection(db, "cases"), { ...caseData, ownerId: user.uid })
  }

  const updateCase = async (
    id: string,
    updates: Partial<Omit<Case, "id" | "ownerId">>
  ) => {
    await updateDoc(doc(db, "cases", id), updates)
  }

  const deleteCase = async (id: string) => {
    await deleteDoc(doc(db, "cases", id))
  }

  return { cases, loading, error, addCase, updateCase, deleteCase }
}
