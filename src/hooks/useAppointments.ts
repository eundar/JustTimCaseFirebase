import { useEffect, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import type { Appointment } from "@/types/models"

export function useAppointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppointments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(db, "appointments"),
      where("ownerId", "==", user.uid)
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAppointments(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
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

  const addAppointment = async (
    appointment: Omit<Appointment, "id" | "ownerId">
  ) => {
    if (!user) throw new Error("Not authenticated")
    await addDoc(collection(db, "appointments"), {
      ...appointment,
      ownerId: user.uid,
    })
  }

  const updateAppointment = async (
    id: string,
    updates: Partial<Omit<Appointment, "id" | "ownerId">>
  ) => {
    await updateDoc(doc(db, "appointments", id), updates)
  }

  const deleteAppointment = async (id: string) => {
    await deleteDoc(doc(db, "appointments", id))
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
