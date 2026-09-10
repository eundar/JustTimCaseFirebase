import { useEffect, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import type { DocumentRecord } from "@/types/models"

type NewDocumentMetadata = {
  name: string
  caseId: string
  clientId: string
  type: DocumentRecord["type"]
}

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocuments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(db, "documents"),
      where("ownerId", "==", user.uid)
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDocuments(
          snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as DocumentRecord
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

  const uploadDocument = async (
    file: File,
    metadata: NewDocumentMetadata
  ) => {
    if (!user) throw new Error("Not authenticated")
    const docId = crypto.randomUUID()
    const storagePath = `documents/${user.uid}/${docId}/${file.name}`
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1)
    await addDoc(collection(db, "documents"), {
      ...metadata,
      ownerId: user.uid,
      uploadedDate: new Date().toISOString().split("T")[0],
      size: `${sizeInMb} MB`,
      url,
      storagePath,
    })
  }

  const deleteDocument = async (id: string, storagePath: string) => {
    await deleteObject(ref(storage, storagePath))
    await deleteDoc(doc(db, "documents", id))
  }

  return { documents, loading, error, uploadDocument, deleteDocument }
}
