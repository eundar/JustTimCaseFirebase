import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import type { AttorneyProfile } from "@/types/models"

interface AuthContextValue {
  user: User | null
  attorneyProfile: AttorneyProfile | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    name: string,
    specialization: string
  ) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [attorneyProfile, setAttorneyProfile] =
    useState<AttorneyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser)
        if (firebaseUser) {
          const snap = await getDoc(doc(db, "attorneys", firebaseUser.uid))
          setAttorneyProfile(
            snap.exists() ? (snap.data() as AttorneyProfile) : null
          )
        } else {
          setAttorneyProfile(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Auth state error:", error)
        setUser(null)
        setAttorneyProfile(null)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const signUp = async (
    email: string,
    password: string,
    name: string,
    specialization: string
  ) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    )
    const profile: AttorneyProfile = { name, specialization, email }
    await setDoc(doc(db, "attorneys", credential.user.uid), profile)
    setAttorneyProfile(profile)
  }

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{ user, attorneyProfile, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
