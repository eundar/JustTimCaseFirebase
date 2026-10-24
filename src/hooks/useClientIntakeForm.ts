import { useEffect, useState } from "react"
import { intakeService } from "@/application/services/IntakeService"
import { prospectiveClientRepository } from "@/data/repositories/ProspectiveClientRepository"
import { RepositoryError } from "@/data/repositories/RepositoryError"
import { useAuth } from "@/context/AuthContext"
import type { ProspectiveClient } from "@/domain/models"

export function useProspectiveClients() {
  const { user } = useAuth()
  const ownerId = user?.uid
  const [subscriptionState, setSubscriptionState] = useState<{
    ownerId: string
    records: ProspectiveClient[]
    loading: boolean
    error: Error | null
  } | null>(null)

  useEffect(() => {
    if (!ownerId) {
      return
    }

    return prospectiveClientRepository.subscribe(
      (records) => {
        setSubscriptionState({
          ownerId,
          records,
          loading: false,
          error: null,
        })
      },
      (subscriptionError) => {
        setSubscriptionState({
          ownerId,
          records: [],
          loading: false,
          error: subscriptionError,
        })
      }
    )
  }, [ownerId])

  const isCurrentOwner = subscriptionState?.ownerId === ownerId
  const prospectiveClients =
    ownerId && isCurrentOwner ? (subscriptionState?.records ?? []) : []
  const loading =
    Boolean(ownerId) &&
    (!isCurrentOwner || (subscriptionState?.loading ?? true))
  const error = isCurrentOwner ? (subscriptionState?.error ?? null) : null

  const addProspectiveClient = (
    data: Omit<ProspectiveClient, "id" | "status" | "createdAt">
  ) => intakeService.submit(data)

  const rejectProspectiveClient = (id: string) => {
    if (!ownerId) {
      throw new RepositoryError("Decline prospective client", new Error("Not authenticated"))
    }
    return intakeService.decline(id)
  }

  const acceptProspectiveClient = (id: string) => {
    if (!ownerId) {
      throw new RepositoryError("Accept prospective client", new Error("Not authenticated"))
    }
    return intakeService.accept(id, ownerId)
  }

  const checkConflictOfInterest = (prospectiveClientId: string) => {
    if (!ownerId) {
      throw new RepositoryError("Check intake conflict", new Error("Not authenticated"))
    }
    return intakeService.checkConflict(ownerId, prospectiveClientId)
  }

  return {
    prospectiveClients,
    loading,
    error,
    addProspectiveClient,
    rejectProspectiveClient,
    acceptProspectiveClient,
    checkConflictOfInterest,
  }
}
