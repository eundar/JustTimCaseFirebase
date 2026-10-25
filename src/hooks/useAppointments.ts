import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { Appointment } from "@/domain/models"
import { appointmentRepository } from "@/data/repositories/AppointmentRepository"
import { RepositoryError } from "@/data/repositories/RepositoryError"

export function useAppointments() {
  const { user } = useAuth()
  const userId = user?.uid
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppointments([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const unsubscribe = appointmentRepository.subscribe(
      userId,
      (records) => {
        setAppointments(records)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [userId])

  const addAppointment = async (
    appointment: Omit<Appointment, "id" | "ownerId">
  ) => {
    if (!userId) throw new RepositoryError("Create appointment", new Error("Not authenticated"))
    await appointmentRepository.create(userId, appointment)
  }

  const updateAppointment = async (
    id: string,
    updates: Partial<Omit<Appointment, "id" | "ownerId">>
  ) => {
    if (!userId) throw new RepositoryError("Update appointment", new Error("Not authenticated"))
    await appointmentRepository.update(userId, id, updates)
  }

  const deleteAppointment = async (id: string) => {
    if (!userId) throw new RepositoryError("Delete appointment", new Error("Not authenticated"))
    await appointmentRepository.delete(userId, id)
  }

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  }
}
