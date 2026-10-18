import { useEffect, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import type { ProspectiveClient } from "@/types/models"
import type { ConflictMatch, ConflictCheckResult } from "@/types/types"

export function useProspectiveClients() {
  const { user } = useAuth()
  const [prospectiveClients, setProspectiveClients] = useState<
    ProspectiveClient[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setProspectiveClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(
      collection(db, "prospectiveClients"),
      orderBy("createdAt", "desc")
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProspectiveClients(
          snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as ProspectiveClient
          )
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

  const addProspectiveClient = async (
    prospectiveClientData: Omit<
      ProspectiveClient,
      "id" | "status" | "createdAt"
    >
  ) => {
    await addDoc(collection(db, "prospectiveClients"), {
      ...prospectiveClientData,
      status: "Pending Review",
      createdAt: new Date().toISOString(),
    })
  }

  const rejectProspectiveClient = async (id: string) => {
    if (!user) {
      throw new Error("User not authenticated")
    }
    await deleteDoc(doc(db, "prospectiveClients", id))
  }

  const acceptProspectiveClient = async (id: string) => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    const prospectiveClientRef = doc(db, "prospectiveClients", id)
    const prospectiveClientSnapshot = await getDoc(prospectiveClientRef)

    //check if the prospective client exists
    if (!prospectiveClientSnapshot.exists()) {
      throw new Error("Prospective client not found")
    }

    const prospectiveClientData =
      prospectiveClientSnapshot.data() as ProspectiveClient

    //check if the prospective client has already been processed
    if (prospectiveClientData.status !== "Pending Review") {
      throw new Error("Prospective client has already been processed")
    }

    const clientRef = await addDoc(collection(db, "clients"), {
      ownerId: user.uid,
      name: prospectiveClientData.fullName,
      email: prospectiveClientData.email,
      phone: prospectiveClientData.phone,
    })

    await updateDoc(prospectiveClientRef, {
      status: "Accepted",
    })

    return clientRef.id
  }

  const checkConflictOfInterest = async (
    prospectiveClientId: string
  ): Promise<ConflictCheckResult> => {
    if (!user) {
      throw new Error("You must be signed in to check conflicts.")
    }

    // Get the intake being checked.
    const intakeRef = doc(db, "prospectiveClients", prospectiveClientId)

    const intakeSnapshot = await getDoc(intakeRef)

    if (!intakeSnapshot.exists()) {
      throw new Error("Prospective client not found.")
    }

    const intake = intakeSnapshot.data() as ProspectiveClient

    const namesToCheck = [intake.fullName, intake.opposingParty ?? ""]
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)

    // Load existing client records and other intake submissions.
    const [clientsSnapshot, intakesSnapshot] = await Promise.all([
      getDocs(collection(db, "clients")),
      getDocs(collection(db, "prospectiveClients")),
    ])

    const matches: ConflictMatch[] = []

    // Check names against existing clients.
    clientsSnapshot.forEach((clientDoc) => {
      const client = clientDoc.data()
      const clientName =
        typeof client.name === "string" ? client.name.trim() : ""

      if (clientName && namesToCheck.includes(clientName.toLowerCase())) {
        matches.push({
          matchedName: clientName,
          source: "Existing Client",
          description: "A name matches an existing client record.",
        })
      }
    })

    // Check names against other intake submissions.
    intakesSnapshot.forEach((intakeDoc) => {
      // Don't compare the intake against itself.
      if (intakeDoc.id === prospectiveClientId) return

      const otherIntake = intakeDoc.data()

      const otherNames = [
        otherIntake.fullName,
        otherIntake.opposingParty,
      ].filter(
        (name): name is string =>
          typeof name === "string" && name.trim().length > 0
      )

      const matchedName = otherNames.find((name) =>
        namesToCheck.includes(name.trim().toLowerCase())
      )

      if (matchedName) {
        matches.push({
          matchedName: matchedName.trim(),
          source: "Other Intake",
          description: "A name matches a party in another intake submission.",
        })
      }
    })

    return {
      hasPotentialConflict: matches.length > 0,
      matches,
    }
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
