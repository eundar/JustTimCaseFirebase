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
import type { Client } from "@/types/models"

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClients([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(
      collection(db, "clients"),
      (snapshot) => {
        setClients(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Client)
        )
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [user])

  const addClient = async (client: Omit<Client, "id" | "ownerId">) => {
    if (!user) throw new Error("Not authenticated")
    await addDoc(collection(db, "clients"), { ...client, ownerId: user.uid })
  }

  const updateClient = async (
    id: string,
    updates: Partial<Omit<Client, "id" | "ownerId">>
  ) => {
    await updateDoc(doc(db, "clients", id), updates)
  }

  const deleteClient = async (id: string) => {
    await deleteDoc(doc(db, "clients", id))
  }

  return { clients, loading, error, addClient, updateClient, deleteClient }
}
