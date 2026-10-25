import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { Client } from "@/domain/models"
import { clientRepository } from "@/data/repositories/ClientRepository"
import { RepositoryError } from "@/data/repositories/RepositoryError"

export function useClients() {
  const { user } = useAuth()
  const userId = user?.uid
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClients([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const unsubscribe = clientRepository.subscribe(
      userId,
      (records) => {
        setClients(records)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [userId])

  const addClient = async (client: Omit<Client, "id" | "ownerId">) => {
    if (!userId) throw new RepositoryError("Create client", new Error("Not authenticated"))
    await clientRepository.create(userId, client)
  }

  const updateClient = async (
    id: string,
    updates: Partial<Omit<Client, "id" | "ownerId">>
  ) => {
    if (!userId) throw new RepositoryError("Update client", new Error("Not authenticated"))
    await clientRepository.update(userId, id, updates)
  }

  const deleteClient = async (id: string) => {
    if (!userId) throw new RepositoryError("Delete client", new Error("Not authenticated"))
    await clientRepository.delete(userId, id)
  }

  return { clients, loading, error, addClient, updateClient, deleteClient }
}
