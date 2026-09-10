# Firebase Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `src/data/mockData.ts` layer with a real Firebase backend (Auth + Firestore + Storage), scoped per-attorney, with real-time data and real document uploads.

**Architecture:** A `src/lib/firebase.ts` singleton exposes `auth`/`db`/`storage`. `AuthContext` tracks the signed-in attorney. One hook per Firestore collection (`useClients`, `useCases`, `useAppointments`, `useDocuments`) wraps `onSnapshot` scoped by `ownerId == uid` and exposes mutations; `src/lib/derived.ts` holds pure join/aggregate functions ported from the old `selectors` object. Components swap their `mockData` import for the relevant hook(s) + derived helper(s) — the rendering logic is otherwise unchanged.

**Tech Stack:** React 19, Vite 8, TypeScript (strict), react-router 8, `firebase` (client SDK v9+ modular), `firebase-admin` (seed script only), `tsx` (runs the seed script).

**Spec:** `docs/superpowers/specs/2026-09-10-firebase-backend-design.md`

## Global Constraints

- Every `client`/`case`/`appointment`/`document` Firestore record carries `ownerId` (the creating attorney's Firebase Auth UID); every collection hook queries `where('ownerId', '==', uid)`.
- Firestore reads use `onSnapshot` (real-time), never a one-shot `getDocs`, inside the collection hooks.
- Document uploads go to Firebase Storage at `documents/{uid}/{docId}/{filename}`; the Firestore record stores the resulting `url` and `storagePath`.
- Data-access layer is React Context (`AuthContext`) + one hook per collection. No separate service-module indirection layer.
- The exported type for a document record is named `DocumentRecord`, not `Document` — `Document` collides with the global DOM type from `lib.dom`.
- No test framework exists in this repo and none is being added (spec section 9). Every task's verification is: `npm run typecheck`, `npm run lint`, `npm run build`, plus a described manual `npm run dev` smoke check.
- **No live Firebase project exists yet.** All code must typecheck, lint, and build against empty/placeholder env values — `initializeApp`/`getAuth`/`getFirestore`/`getStorage` never throw synchronously on bad config, so this holds. Do not block any task on having real Firebase credentials. Manual smoke checks that would require a real project (actually signing up, actually reading/writing Firestore data) are called out per-task as "cannot verify without live credentials" rather than treated as failing.
- `tsconfig.app.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` all on: use `import type { X }` for type-only imports, and don't leave unused imports/variables — `npm run typecheck` will fail on them.
- The `@/*` path alias maps to `src/*` (see `vite.config.ts` / `tsconfig.app.json`) — use it for all intra-`src` imports, matching existing code.
- `.env` and `scripts/serviceAccountKey.json` must never be committed — both are added to `.gitignore` in Task 1.

---

### Task 1: Firebase SDK & config foundation

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `src/vite-env.d.ts`
- Create: `src/lib/firebase.ts`
- Create: `src/types/models.ts`

**Interfaces:**
- Produces: `auth`, `db`, `storage` exports from `@/lib/firebase` (Firebase Auth/Firestore/Storage instances). `Client`, `Case`, `Appointment`, `DocumentRecord`, `AttorneyProfile` exported types from `@/types/models`. Every later task imports these.

- [ ] **Step 1: Install the Firebase client SDK and the seed-script tooling**

Run:
```bash
npm install firebase
npm install -D firebase-admin tsx
```

- [ ] **Step 2: Add `.env` and the seed script's service account key to `.gitignore`**

Add these two lines to `.gitignore`, right after the existing `*.local` line:

```
.env
scripts/serviceAccountKey.json
```

- [ ] **Step 3: Create `.env.example`**

Create `.env.example` at the repo root:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 4: Create `src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 5: Create `src/types/models.ts`**

These are the same shapes as the old `src/data/mockData.ts` type definitions, plus `ownerId` on every attorney-scoped record, and the document type renamed from `Document` to `DocumentRecord` (avoids colliding with the global DOM `Document` type):

```typescript
export interface AttorneyProfile {
  name: string
  specialization: string
  email: string
}

export interface Client {
  id: string
  ownerId: string
  name: string
  email: string
  phone: string
}

export interface Case {
  id: string
  ownerId: string
  title: string
  clientId: string
  type: string
  status: "Active" | "Pending" | "Closed"
  openDate: string
}

export interface Appointment {
  id: string
  ownerId: string
  clientId: string
  caseId: string | null
  type: string
  date: string
  time: string
  status: "Scheduled" | "Confirmed" | "Completed" | "Pending"
  location: string
}

export interface DocumentRecord {
  id: string
  ownerId: string
  name: string
  caseId: string
  clientId: string
  type: "Contract" | "Brief" | "Invoice" | "Agreement" | "Other"
  uploadedDate: string
  size: string
  url: string
  storagePath: string
}
```

- [ ] **Step 6: Create `src/lib/firebase.ts`**

```typescript
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
```

- [ ] **Step 7: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed (no real Firebase credentials are needed — `initializeApp` and the `get*` calls don't validate config synchronously).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example src/vite-env.d.ts src/lib/firebase.ts src/types/models.ts
git commit -m "feat: add Firebase SDK, env config, and data model types"
```

---

### Task 2: Auth context, login page, route guard, sign-out wiring

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/pages/Login.tsx`
- Modify: `src/App.tsx`
- Modify: `src/router.tsx`
- Modify: `src/main.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`

**Interfaces:**
- Consumes: `auth`, `db` from `@/lib/firebase` (Task 1). `AttorneyProfile` from `@/types/models` (Task 1).
- Produces: `AuthProvider` component and `useAuth()` hook from `@/context/AuthContext`, returning `{ user: import("firebase/auth").User | null, attorneyProfile: AttorneyProfile | null, loading: boolean, signUp(email, password, name, specialization): Promise<void>, signIn(email, password): Promise<void>, signOut(): Promise<void> }`. Every later task that reads/writes Firestore uses `useAuth()` for `user.uid`.

- [ ] **Step 1: Create `src/context/AuthContext.tsx`**

```tsx
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
    })
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
```

- [ ] **Step 2: Create `src/pages/Login.tsx`**

```tsx
import { useState, type FormEvent } from "react"
import { Navigate } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"

function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists."
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password."
    case "auth/user-not-found":
      return "No account found with this email."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/invalid-email":
      return "Enter a valid email address."
    default:
      return "Something went wrong. Please try again."
  }
}

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === "sign-in") {
        await signIn(email, password)
      } else {
        await signUp(email, password, name, specialization)
      }
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === "sign-in" ? "Sign in" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Sign in to JusTimCase to manage your cases."
              : "Set up your attorney account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? "Please wait..."
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() =>
              setMode(mode === "sign-in" ? "sign-up" : "sign-in")
            }
          >
            {mode === "sign-in"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Add the route guard to `src/App.tsx`**

Replace the full contents of `src/App.tsx`:

```tsx
import { Navigate, Outlet } from "react-router"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

export function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <AppHeader />

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
```

- [ ] **Step 4: Add the `/login` route to `src/router.tsx`**

Replace the full contents of `src/router.tsx`:

```tsx
import { createBrowserRouter } from "react-router"

import App from "./App"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Clients from "./pages/Clients"
import Cases from "./pages/Cases"
import Documents from "./pages/Documents"
import Appointments from "./pages/Appointments"
import Settings from "./pages/Settings"

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: App,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "clients",
        Component: Clients,
      },
      {
        path: "cases",
        Component: Cases,
      },
      {
        path: "documents",
        Component: Documents,
      },
      {
        path: "appointments",
        Component: Appointments,
      },
      {
        path: "settings",
        Component: Settings,
      },
    ],
  },
])
```

- [ ] **Step 5: Wrap the router in `AuthProvider` in `src/main.tsx`**

Replace the full contents of `src/main.tsx`:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import "./index.css"
import { router } from "./router.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/context/AuthContext"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)
```

- [ ] **Step 6: Wire the existing Logout button in `src/components/layout/AppSidebar.tsx`**

Replace the full contents of `src/components/layout/AppSidebar.tsx`:

```tsx
import { Link } from "react-router"
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
  Briefcase,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

const navigation = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Clients",
    icon: Users,
    path: "/clients",
  },
  {
    title: "Cases",
    icon: Briefcase,
    path: "/cases",
  },
  {
    title: "Documents",
    icon: FileText,
    path: "/documents",
  },
  {
    title: "Appointments",
    icon: CalendarDays,
    path: "/appointments",
  },
]

export function AppSidebar() {
  const { signOut } = useAuth()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">
          Burdeos Law Firm
        </h1>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroupLabel className="px-3 pb-2 text-xs tracking-wider uppercase">
          Main Menu
        </SidebarGroupLabel>{" "}
        <SidebarMenu>
          {navigation.map((item) => (
            <Link to={item.path} className="flex items-center gap-2">
              <SidebarMenuButton key={item.path} className="h-11 px-3 text-sm">
                <item.icon className="size-5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </Link>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => signOut()}>
            <LogOut className="size-5" />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}
```

- [ ] **Step 7: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed.

Then run `npm run dev`, open the printed local URL in a browser, and confirm you're redirected to `/login` (there is no signed-in user). This part is verifiable without real Firebase credentials — `onAuthStateChanged` resolves to `null` locally without a network call succeeding. **Cannot verify without live credentials:** actually submitting sign-up/sign-in (the Firebase Auth REST call will fail against a placeholder project) — leave that for the project owner once real `.env` values are in place.

- [ ] **Step 8: Commit**

```bash
git add src/context/AuthContext.tsx src/pages/Login.tsx src/App.tsx src/router.tsx src/main.tsx src/components/layout/AppSidebar.tsx
git commit -m "feat: add Firebase Auth context, login page, and route guard"
```

---

### Task 3: Pure derived/join helpers

**Files:**
- Create: `src/lib/derived.ts`

**Interfaces:**
- Consumes: `Client`, `Case`, `Appointment`, `DocumentRecord` types from `@/types/models` (Task 1).
- Produces: `getClientById`, `getClientCaseCount`, `getAllClientsWithCaseCounts`, `getCaseById`, `getCasesByClientId`, `getCasesWithDetails`, `getRecentCases`, `getAppointmentsByClientId`, `getAppointmentsWithDetails`, `getDocumentsByCaseId`, `getDocumentsByClientId`, `getDocumentsWithDetails`, `getStatistics` — all pure functions taking plain arrays, no Firebase dependency. Tasks 6-10 import these.

- [ ] **Step 1: Create `src/lib/derived.ts`**

```typescript
import type { Client, Case, Appointment, DocumentRecord } from "@/types/models"

export function getClientById(
  clients: Client[],
  clientId: string
): Client | undefined {
  return clients.find((c) => c.id === clientId)
}

export function getClientCaseCount(cases: Case[], clientId: string): number {
  return cases.filter((c) => c.clientId === clientId).length
}

export function getAllClientsWithCaseCounts(
  clients: Client[],
  cases: Case[]
): (Client & { casesCount: number })[] {
  return clients.map((client) => ({
    ...client,
    casesCount: getClientCaseCount(cases, client.id),
  }))
}

export function getCaseById(cases: Case[], caseId: string): Case | undefined {
  return cases.find((c) => c.id === caseId)
}

export function getCasesByClientId(cases: Case[], clientId: string): Case[] {
  return cases.filter((c) => c.clientId === clientId)
}

export function getCasesWithDetails(
  cases: Case[],
  clients: Client[]
): (Case & { client: Client | undefined })[] {
  return cases.map((caseItem) => ({
    ...caseItem,
    client: getClientById(clients, caseItem.clientId),
  }))
}

export function getRecentCases(
  cases: Case[],
  clients: Client[],
  limit = 4
): (Case & { client: Client | undefined })[] {
  return getCasesWithDetails(cases, clients).slice(0, limit)
}

export function getAppointmentsByClientId(
  appointments: Appointment[],
  clientId: string
): Appointment[] {
  return appointments.filter((a) => a.clientId === clientId)
}

export function getAppointmentsWithDetails(
  appointments: Appointment[],
  clients: Client[],
  cases: Case[]
): (Appointment & {
  client: Client | undefined
  case: Case | null | undefined
})[] {
  return appointments.map((appointment) => ({
    ...appointment,
    client: getClientById(clients, appointment.clientId),
    case: appointment.caseId ? getCaseById(cases, appointment.caseId) : null,
  }))
}

export function getDocumentsByCaseId(
  documents: DocumentRecord[],
  caseId: string
): DocumentRecord[] {
  return documents.filter((d) => d.caseId === caseId)
}

export function getDocumentsByClientId(
  documents: DocumentRecord[],
  clientId: string
): DocumentRecord[] {
  return documents.filter((d) => d.clientId === clientId)
}

export function getDocumentsWithDetails(
  documents: DocumentRecord[],
  clients: Client[],
  cases: Case[]
): (DocumentRecord & {
  client: Client | undefined
  case: Case | undefined
})[] {
  return documents.map((document) => ({
    ...document,
    client: getClientById(clients, document.clientId),
    case: getCaseById(cases, document.caseId),
  }))
}

export function getStatistics(
  clients: Client[],
  cases: Case[],
  appointments: Appointment[],
  documents: DocumentRecord[]
) {
  return {
    totalClients: clients.length,
    activeCases: cases.filter((c) => c.status === "Active").length,
    totalDocuments: documents.length,
    upcomingAppointments: appointments.filter(
      (a) => a.status === "Scheduled" || a.status === "Confirmed"
    ).length,
  }
}
```

- [ ] **Step 2: Write a temporary behavior check**

Create a scratch file `scripts/_check-derived.ts` (this file is deleted at the end of this task — it is not part of the app):

```typescript
import {
  getAllClientsWithCaseCounts,
  getCasesWithDetails,
  getRecentCases,
  getAppointmentsWithDetails,
  getDocumentsWithDetails,
  getStatistics,
} from "../src/lib/derived"
import type {
  Client,
  Case,
  Appointment,
  DocumentRecord,
} from "../src/types/models"

const clients: Client[] = [
  { id: "CLT-1", ownerId: "u1", name: "Alice", email: "a@x.com", phone: "1" },
]
const cases: Case[] = [
  {
    id: "CASE-1",
    ownerId: "u1",
    title: "Alice v. Bob",
    clientId: "CLT-1",
    type: "Civil",
    status: "Active",
    openDate: "2024-01-01",
  },
]
const appointments: Appointment[] = [
  {
    id: "APT-1",
    ownerId: "u1",
    clientId: "CLT-1",
    caseId: "CASE-1",
    type: "Consult",
    date: "2024-01-02",
    time: "10:00",
    status: "Scheduled",
    location: "Office",
  },
]
const documents: DocumentRecord[] = [
  {
    id: "DOC-1",
    ownerId: "u1",
    name: "Contract",
    caseId: "CASE-1",
    clientId: "CLT-1",
    type: "Contract",
    uploadedDate: "2024-01-03",
    size: "1 MB",
    url: "https://x",
    storagePath: "documents/u1/DOC-1/contract.pdf",
  },
]

const failures: string[] = []
const check = (label: string, condition: boolean) => {
  if (!condition) failures.push(label)
}

check(
  "casesCount",
  getAllClientsWithCaseCounts(clients, cases)[0].casesCount === 1
)
check(
  "case-client join",
  getCasesWithDetails(cases, clients)[0].client?.name === "Alice"
)
check("recent cases", getRecentCases(cases, clients, 4).length === 1)
check(
  "appointment-case join",
  getAppointmentsWithDetails(appointments, clients, cases)[0].case?.title ===
    "Alice v. Bob"
)
check(
  "document-client join",
  getDocumentsWithDetails(documents, clients, cases)[0].client?.name ===
    "Alice"
)
const stats = getStatistics(clients, cases, appointments, documents)
check(
  "statistics",
  stats.totalClients === 1 &&
    stats.activeCases === 1 &&
    stats.totalDocuments === 1 &&
    stats.upcomingAppointments === 1
)

if (failures.length > 0) {
  console.error("FAILED:", failures.join(", "))
  process.exit(1)
}
console.log("All derived.ts checks passed")
```

- [ ] **Step 3: Run the check and verify it passes**

Run:
```bash
npx tsx scripts/_check-derived.ts
```
Expected output: `All derived.ts checks passed` (exit code 0).

- [ ] **Step 4: Delete the scratch check file**

```bash
rm scripts/_check-derived.ts
```

- [ ] **Step 5: Verify the full gate**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/derived.ts
git commit -m "feat: add pure derived/join helpers ported from mockData selectors"
```

---

### Task 4: Firestore hooks — clients & cases

**Files:**
- Create: `src/hooks/useClients.ts`
- Create: `src/hooks/useCases.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/firebase` (Task 1), `useAuth` from `@/context/AuthContext` (Task 2), `Client`/`Case` types from `@/types/models` (Task 1).
- Produces: `useClients()` → `{ clients: Client[], loading: boolean, error: Error | null, addClient(data: Omit<Client,"id"|"ownerId">): Promise<void>, updateClient(id: string, updates: Partial<Omit<Client,"id"|"ownerId">>): Promise<void>, deleteClient(id: string): Promise<void> }`. `useCases()` → same shape for `Case`, with `addCase`/`updateCase`/`deleteCase`. Tasks 6, 7, 8, 9, 10 consume both.

- [ ] **Step 1: Create `src/hooks/useClients.ts`**

```typescript
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
import type { Client } from "@/types/models"

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setClients([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, "clients"), where("ownerId", "==", user.uid))
    const unsubscribe = onSnapshot(
      q,
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
```

- [ ] **Step 2: Create `src/hooks/useCases.ts`**

```typescript
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
import type { Case } from "@/types/models"

export function useCases() {
  const { user } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setCases([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, "cases"), where("ownerId", "==", user.uid))
    const unsubscribe = onSnapshot(
      q,
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
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed. **Cannot verify without live credentials:** actually subscribing to real Firestore data — these hooks aren't called from any component yet (that starts in Task 6), so there's nothing to smoke-test in the browser this task.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useClients.ts src/hooks/useCases.ts
git commit -m "feat: add useClients and useCases Firestore hooks"
```

---

### Task 5: Firestore + Storage hooks — appointments & documents

**Files:**
- Create: `src/hooks/useAppointments.ts`
- Create: `src/hooks/useDocuments.ts`

**Interfaces:**
- Consumes: `db`, `storage` from `@/lib/firebase` (Task 1), `useAuth` from `@/context/AuthContext` (Task 2), `Appointment`/`DocumentRecord` types from `@/types/models` (Task 1).
- Produces: `useAppointments()` → `{ appointments: Appointment[], loading: boolean, error: Error | null, addAppointment(data: Omit<Appointment,"id"|"ownerId">): Promise<void>, updateAppointment(id, updates): Promise<void>, deleteAppointment(id): Promise<void> }`. `useDocuments()` → `{ documents: DocumentRecord[], loading: boolean, error: Error | null, uploadDocument(file: File, metadata: { name: string, caseId: string, clientId: string, type: DocumentRecord["type"] }): Promise<void>, deleteDocument(id: string, storagePath: string): Promise<void> }`. Tasks 8, 9, 10 consume `useAppointments`; Tasks 9, 10 consume `useDocuments`.

- [ ] **Step 1: Create `src/hooks/useAppointments.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/hooks/useDocuments.ts`**

```typescript
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
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed. **Cannot verify without live credentials:** actual upload/read against Storage/Firestore — no component calls these hooks yet (that starts in Task 9).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAppointments.ts src/hooks/useDocuments.ts
git commit -m "feat: add useAppointments and useDocuments hooks with Storage upload"
```

---

### Task 6: Clients domain component migration

**Files:**
- Modify: `src/components/dashboard/AddClient.tsx`
- Modify: `src/components/dashboard/ClientProfile.tsx`
- Modify: `src/pages/Clients.tsx`

**Interfaces:**
- Consumes: `useClients` (Task 4), `useCases` (Task 4), `getAllClientsWithCaseCounts`/`getCasesByClientId`/`getAppointmentsByClientId`/`getDocumentsByClientId`/`getClientById` (Task 3), `Client` type (Task 1). Also needs `useAppointments`/`useDocuments` (Task 5) inside `ClientProfile.tsx`.
- Produces: no new exports — this is a leaf migration. Nothing later depends on these files' internals, only on their unchanged component signatures (`<AddClient open onOpenChange />`, `<ClientProfile clientId />`).

- [ ] **Step 1: Replace `src/components/dashboard/AddClient.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useClients } from "@/hooks/useClients"

import type { Client } from "@/types/models"

type NewClient = Omit<Client, "id" | "ownerId">

interface AddClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddClient({ open, onOpenChange }: AddClientProps) {
  const { addClient } = useClients()
  const [formData, setFormData] = useState<NewClient>({
    name: "",
    email: "",
    phone: "",
  })

  const [errors, setErrors] = useState<Partial<NewClient>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<NewClient> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required"
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = "Phone must contain numbers only"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (validateForm()) {
      await addClient(formData)
      setFormData({
        name: "",
        email: "",
        phone: "",
      })
      setErrors({})
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Enter the client's information to add them to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter client's full name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Replace `src/components/dashboard/ClientProfile.tsx`**

```tsx
"use client"

import { Mail, Phone, User, Briefcase, Calendar, FileText } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { useDocuments } from "@/hooks/useDocuments"
import {
  getClientById,
  getCasesByClientId,
  getAppointmentsByClientId,
  getDocumentsByClientId,
} from "@/lib/derived"

interface ClientProfileProps {
  clientId: string
}

export function ClientProfile({ clientId }: ClientProfileProps) {
  const { clients: allClients, loading: clientsLoading } = useClients()
  const { cases: allCases, loading: casesLoading } = useCases()
  const { appointments: allAppointments, loading: appointmentsLoading } =
    useAppointments()
  const { documents: allDocuments, loading: documentsLoading } =
    useDocuments()

  if (
    clientsLoading ||
    casesLoading ||
    appointmentsLoading ||
    documentsLoading
  ) {
    return <Skeleton className="h-64 w-full" />
  }

  const client = getClientById(allClients, clientId)
  const cases = getCasesByClientId(allCases, clientId)
  const appointments = getAppointmentsByClientId(allAppointments, clientId)
  const documents = getDocumentsByClientId(allDocuments, clientId)

  if (!client) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Client not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Client Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{client.name}</CardTitle>
              <CardDescription>Client ID: {client.id}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-sm break-all">{client.email}</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Phone</span>
              </div>
              <p className="text-sm">{client.phone}</p>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client ID</span>
              </div>
              <p className="font-mono text-sm">{client.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {cases.filter((c) => c.status === "Active").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {cases.length} total cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                appointments.filter(
                  (a) => a.status === "Scheduled" || a.status === "Confirmed"
                ).length
              }
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {appointments.length} total appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documents.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              total documents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Cases
          </CardTitle>
          <CardDescription>
            {cases.length} case{cases.length !== 1 ? "s" : ""} associated with
            this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Open Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.id}</TableCell>
                    <TableCell>{caseItem.title}</TableCell>
                    <TableCell>{caseItem.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          caseItem.status === "Closed"
                            ? "secondary"
                            : caseItem.status === "Pending"
                              ? "outline"
                              : "default"
                        }
                      >
                        {caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{caseItem.openDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No cases found for this client.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </CardTitle>
          <CardDescription>
            {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""} scheduled for this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.id}
                    </TableCell>
                    <TableCell>{appointment.type}</TableCell>
                    <TableCell>{appointment.date}</TableCell>
                    <TableCell>{appointment.time}</TableCell>
                    <TableCell>{appointment.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          appointment.status === "Completed"
                            ? "secondary"
                            : appointment.status === "Confirmed"
                              ? "default"
                              : appointment.status === "Scheduled"
                                ? "outline"
                                : "secondary"
                        }
                      >
                        {appointment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No appointments found for this client.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
            associated with this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.id}</TableCell>
                    <TableCell>{document.name}</TableCell>
                    <TableCell>{document.caseId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{document.type}</Badge>
                    </TableCell>
                    <TableCell>{document.uploadedDate}</TableCell>
                    <TableCell>{document.size}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No documents found for this client.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/pages/Clients.tsx`**

```tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Plus, ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { getAllClientsWithCaseCounts } from "@/lib/derived"
import AddClient from "@/components/dashboard/AddClient"
import { ClientProfile } from "@/components/dashboard/ClientProfile"

export default function Clients() {
  const [open, setOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const { clients: allClients, loading: clientsLoading } = useClients()
  const { cases: allCases, loading: casesLoading } = useCases()

  if (selectedClientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClientId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
        </div>
        <ClientProfile clientId={selectedClientId} />
      </div>
    )
  }

  if (clientsLoading || casesLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const clients = getAllClientsWithCaseCounts(allClients, allCases)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage all client information and case associations.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
        <AddClient open={open} onOpenChange={setOpen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Clients</CardTitle>
          <CardDescription>
            Filter clients by name or contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by name, email, or phone..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {clients.length} total clients in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          {clients.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No Client</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.id}</TableCell>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed.

Then run `npm run dev`. **Cannot verify without live credentials:** signing in and exercising the Clients page — that requires a real signed-in user, which requires real Firebase credentials.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/AddClient.tsx src/components/dashboard/ClientProfile.tsx src/pages/Clients.tsx
git commit -m "feat: migrate Clients domain to Firestore hooks"
```

---

### Task 7: Cases domain component migration

**Files:**
- Modify: `src/components/dashboard/AddCase.tsx`
- Modify: `src/components/dashboard/CaseProfile.tsx`
- Modify: `src/pages/Cases.tsx`
- Modify: `src/components/dashboard/RecentCases.tsx`

**Interfaces:**
- Consumes: `useClients`, `useCases` (Task 4), `useAppointments`, `useDocuments` (Task 5), `getCaseById`/`getClientById`/`getDocumentsByCaseId`/`getAppointmentsWithDetails`/`getCasesWithDetails`/`getRecentCases` (Task 3), `Case` type (Task 1).
- Produces: no new exports — leaf migration, only component signatures matter to later tasks (`<AddCase open onOpenChange />`, `<CaseProfile caseId />`, `<RecentCases />`).

- [ ] **Step 1: Replace `src/components/dashboard/AddCase.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"

import type { Case } from "@/types/models"

type NewCase = Omit<Case, "id" | "ownerId">

interface AddCaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddCase({ open, onOpenChange }: AddCaseProps) {
  const { clients } = useClients()
  const { addCase } = useCases()
  const [formData, setFormData] = useState<NewCase>({
    title: "",
    clientId: "",
    type: "",
    status: "Active",
    openDate: new Date().toISOString().split("T")[0],
  })

  const [errors, setErrors] = useState<Partial<NewCase>>({})

  const caseTypes = [
    "Civil",
    "Criminal",
    "Family",
    "Property",
    "Personal Injury",
    "Contract",
    "Employment",
    "Other",
  ]

  const validateForm = (): boolean => {
    const newErrors: Partial<NewCase> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Case title is required"
    }

    if (!formData.clientId) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.type) {
      newErrors.type = "Case type is required"
    }

    if (!formData.openDate) {
      newErrors.openDate = "Open date is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (validateForm()) {
      await addCase(formData)
      setFormData({
        title: "",
        clientId: "",
        type: "",
        status: "Active",
        openDate: new Date().toISOString().split("T")[0],
      })
      setErrors({})
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    setFormData({
      title: "",
      clientId: "",
      type: "",
      status: "Active",
      openDate: new Date().toISOString().split("T")[0],
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Enter the case details to create a new case in the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Case Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Smith v. Johnson"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  clientId: value as NewCase["clientId"],
                })
              }
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Case Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as NewCase["type"] })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select case type" />
              </SelectTrigger>
              <SelectContent>
                {caseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="openDate">Open Date *</Label>
            <Input
              id="openDate"
              type="date"
              value={formData.openDate}
              onChange={(e) =>
                setFormData({ ...formData, openDate: e.target.value })
              }
              className={errors.openDate ? "border-red-500" : ""}
            />
            {errors.openDate && (
              <p className="text-sm text-red-500">{errors.openDate}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Case</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Replace `src/components/dashboard/CaseProfile.tsx`**

```tsx
"use client"

import { Calendar, FileText, User, Clock, Tag } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { useDocuments } from "@/hooks/useDocuments"
import {
  getCaseById,
  getClientById,
  getDocumentsByCaseId,
  getAppointmentsWithDetails,
} from "@/lib/derived"

interface CaseProfileProps {
  caseId: string
}

export function CaseProfile({ caseId }: CaseProfileProps) {
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const { appointments: allAppointments, loading: appointmentsLoading } =
    useAppointments()
  const { documents: allDocuments, loading: documentsLoading } =
    useDocuments()

  if (
    clientsLoading ||
    casesLoading ||
    appointmentsLoading ||
    documentsLoading
  ) {
    return <Skeleton className="h-64 w-full" />
  }

  const caseData = getCaseById(cases, caseId)
  const documents = getDocumentsByCaseId(allDocuments, caseId)
  const allAppointmentsWithDetails = getAppointmentsWithDetails(
    allAppointments,
    clients,
    cases
  )
  const appointments = allAppointmentsWithDetails.filter(
    (apt) => apt.caseId === caseId
  )

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Case not found</p>
        </CardContent>
      </Card>
    )
  }

  const client = getClientById(clients, caseData.clientId)

  const statusVariant = (status: string) => {
    switch (status) {
      case "Closed":
        return "secondary"
      case "Pending":
        return "outline"
      case "Active":
        return "default"
      default:
        return "default"
    }
  }

  return (
    <div className="space-y-6">
      {/* Case Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{caseData.title}</CardTitle>
              <CardDescription>Case ID: {caseData.id}</CardDescription>
            </div>
            <Badge variant={statusVariant(caseData.status)}>
              {caseData.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Case Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Case Type</span>
              </div>
              <p className="text-sm">{caseData.type}</p>
            </div>

            {/* Open Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Open Date</span>
              </div>
              <p className="text-sm">{caseData.openDate}</p>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client</span>
              </div>
              <p className="text-sm font-medium">{client?.name || "N/A"}</p>
              <p className="text-xs text-muted-foreground">{client?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documents.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              total documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                appointments.filter(
                  (a) => a.status === "Scheduled" || a.status === "Confirmed"
                ).length
              }
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of {appointments.length} total appointments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
            associated with this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const docClient = getClientById(clients, doc.clientId)
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.id}</TableCell>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell>{doc.uploadedDate}</TableCell>
                      <TableCell>{doc.size}</TableCell>
                      <TableCell>{docClient?.name || "N/A"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No documents found for this case.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Appointments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </CardTitle>
          <CardDescription>
            {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""} associated with this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {appointment.id}
                    </TableCell>
                    <TableCell>{appointment.client?.name || "N/A"}</TableCell>
                    <TableCell>{appointment.type}</TableCell>
                    <TableCell>{appointment.date}</TableCell>
                    <TableCell>{appointment.time}</TableCell>
                    <TableCell>{appointment.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          appointment.status === "Completed"
                            ? "secondary"
                            : appointment.status === "Confirmed"
                              ? "default"
                              : appointment.status === "Scheduled"
                                ? "outline"
                                : "secondary"
                        }
                      >
                        {appointment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No appointments found for this case.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/pages/Cases.tsx`**

```tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ArrowLeft } from "lucide-react"

import { useState } from "react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { getCasesWithDetails } from "@/lib/derived"
import AddCase from "@/components/dashboard/AddCase.tsx"
import { CaseProfile } from "@/components/dashboard/CaseProfile"

export default function Cases() {
  const [open, setOpen] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const { clients, loading: clientsLoading } = useClients()
  const { cases: allCases, loading: casesLoading } = useCases()

  if (selectedCaseId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCaseId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cases
          </Button>
        </div>
        <CaseProfile caseId={selectedCaseId} />
      </div>
    )
  }

  if (clientsLoading || casesLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const cases = getCasesWithDetails(allCases, clients)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground">
            Track and manage all active and closed cases.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Button>
        <AddCase open={open} onOpenChange={setOpen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Cases</CardTitle>
          <CardDescription>
            Filter cases by ID, title, or client name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by case ID, title, or client..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Cases</CardTitle>
          <CardDescription>
            {cases.length} total cases in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Open Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell className="font-medium">{caseItem.id}</TableCell>
                  <TableCell>{caseItem.title}</TableCell>
                  <TableCell>{caseItem.client?.name}</TableCell>
                  <TableCell>{caseItem.type}</TableCell>
                  <TableCell>{caseItem.openDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        caseItem.status === "Closed"
                          ? "secondary"
                          : caseItem.status === "Pending"
                            ? "outline"
                            : "default"
                      }
                    >
                      {caseItem.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCaseId(caseItem.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Replace `src/components/dashboard/RecentCases.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { getRecentCases } from "@/lib/derived"

export function RecentCases() {
  const { clients, loading: clientsLoading } = useClients()
  const { cases: allCases, loading: casesLoading } = useCases()

  if (clientsLoading || casesLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  const cases = getRecentCases(allCases, clients)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Cases</CardTitle>

        <CardDescription>Recently updated cases in the system.</CardDescription>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {cases.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>

                <TableCell>{item.client?.name}</TableCell>

                <TableCell>{item.type}</TableCell>

                <TableCell>
                  <Badge
                    variant={
                      item.status === "Closed"
                        ? "secondary"
                        : item.status === "Pending"
                          ? "outline"
                          : "default"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed. **Cannot verify without live credentials:** signing in and exercising the Cases page/RecentCases widget.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/AddCase.tsx src/components/dashboard/CaseProfile.tsx src/pages/Cases.tsx src/components/dashboard/RecentCases.tsx
git commit -m "feat: migrate Cases domain to Firestore hooks"
```

---

### Task 8: Appointments domain component migration

**Files:**
- Modify: `src/components/dashboard/ScheduleAppointment.tsx`
- Modify: `src/pages/Appointments.tsx`
- Modify: `src/components/dashboard/UpcommingAppointments.tsx`

**Interfaces:**
- Consumes: `useClients`, `useCases` (Task 4), `useAppointments` (Task 5), `getAppointmentsWithDetails` (Task 3), `Appointment` type (Task 1).
- Produces: no new exports — leaf migration.

- [ ] **Step 1: Replace `src/components/dashboard/ScheduleAppointment.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Appointment } from "@/types/models"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"

type NewAppointment = Omit<Appointment, "id" | "ownerId" | "status">

interface ScheduleAppointmentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const appointmentTypes = [
  "Initial Consultation",
  "Case Review",
  "Settlement Meeting",
  "Client Consultation",
  "Status Update",
  "Document Review",
  "Other",
]

const locations = ["Office", "Virtual", "Client Site"]

export default function ScheduleAppointment({
  open,
  onOpenChange,
}: ScheduleAppointmentProps) {
  const { clients } = useClients()
  const { cases } = useCases()
  const { addAppointment } = useAppointments()
  const [formData, setFormData] = useState<NewAppointment>({
    clientId: "",
    caseId: null,
    type: "",
    date: "",
    time: "",
    location: "",
  })

  const [errors, setErrors] = useState<Partial<NewAppointment>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<NewAppointment> = {}

    if (!formData.clientId.trim()) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.type.trim()) {
      newErrors.type = "Appointment type is required"
    }

    if (!formData.date.trim()) {
      newErrors.date = "Date is required"
    } else {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        newErrors.date = "Date cannot be in the past"
      }
    }

    if (!formData.time.trim()) {
      newErrors.time = "Time is required"
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (validateForm()) {
      await addAppointment({ ...formData, status: "Scheduled" })
      setFormData({
        clientId: "",
        caseId: null,
        type: "",
        date: "",
        time: "",
        location: "",
      })
      setErrors({})
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    setFormData({
      clientId: "",
      caseId: null,
      type: "",
      date: "",
      time: "",
      location: "",
    })
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment with a client and attorney.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-select">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value || "" })
              }
            >
              <SelectTrigger
                id="client-select"
                className={errors.clientId ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="case-select">Case (Optional)</Label>
            <Select
              value={formData.caseId || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, caseId: value || null })
              }
            >
              <SelectTrigger id="case-select">
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {cases.map((caseItem) => (
                  <SelectItem key={caseItem.id} value={caseItem.id}>
                    {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-select">Appointment Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value || "" })
              }
            >
              <SelectTrigger
                id="type-select"
                className={errors.type ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-input">Date *</Label>
              <Input
                id="date-input"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input">Time *</Label>
              <Input
                id="time-input"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                className={errors.time ? "border-red-500" : ""}
              />
              {errors.time && (
                <p className="text-sm text-red-500">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-select">Location *</Label>
            <Select
              value={formData.location}
              onValueChange={(value) =>
                setFormData({ ...formData, location: value || "" })
              }
            >
              <SelectTrigger
                id="location-select"
                className={errors.location ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Replace `src/pages/Appointments.tsx`**

```tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"

import { useState } from "react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { getAppointmentsWithDetails } from "@/lib/derived"
import ScheduleAppointment from "@/components/dashboard/ScheduleAppointment"

export default function Appointments() {
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false)
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const { appointments: allAppointments, loading: appointmentsLoading } =
    useAppointments()

  if (clientsLoading || casesLoading || appointmentsLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const appointmentList = getAppointmentsWithDetails(
    allAppointments,
    clients,
    cases
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage client and case appointments.
          </p>
        </div>
        <Button onClick={() => setOpenScheduleDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Appointments</CardTitle>
          <CardDescription>
            Filter appointments by client, or date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by client, or date..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>
            {appointmentList.length} total appointments in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appointment ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {appointmentList.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">
                    {appointment.id}
                  </TableCell>
                  <TableCell>{appointment.client?.name}</TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    {appointment.date} at {appointment.time}
                  </TableCell>
                  <TableCell>{appointment.location}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        appointment.status === "Completed"
                          ? "secondary"
                          : appointment.status === "Pending"
                            ? "outline"
                            : "default"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ScheduleAppointment
        open={openScheduleDialog}
        onOpenChange={setOpenScheduleDialog}
      />
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/components/dashboard/UpcommingAppointments.tsx`**

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, Clock } from "lucide-react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { getAppointmentsWithDetails } from "@/lib/derived"

export function UpcommingAppointments() {
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const { appointments: allAppointments, loading: appointmentsLoading } =
    useAppointments()

  if (clientsLoading || casesLoading || appointmentsLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  const appointments = getAppointmentsWithDetails(
    allAppointments,
    clients,
    cases
  )

  const upcomingAppointments = appointments
    .filter((apt) => apt.status === "Scheduled" || apt.status === "Confirmed")
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Next scheduled appointments for your clients.
            </CardDescription>
          </div>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {upcomingAppointments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Date & Time
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {upcomingAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="text-sm font-medium">
                    {appointment.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {appointment.client?.name || "N/A"}
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell className="text-sm">
                    {appointment.date} at {appointment.time}
                  </TableCell>
                  <TableCell className="text-sm">
                    {appointment.location}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        appointment.status === "Confirmed"
                          ? "default"
                          : appointment.status === "Scheduled"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No upcoming appointments scheduled.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed. **Cannot verify without live credentials:** signing in and exercising the Appointments page.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ScheduleAppointment.tsx src/pages/Appointments.tsx src/components/dashboard/UpcommingAppointments.tsx
git commit -m "feat: migrate Appointments domain to Firestore hooks"
```

---

### Task 9: Documents domain component migration

**Files:**
- Modify: `src/components/dashboard/AddDocument.tsx` (currently empty — this task writes it from scratch)
- Modify: `src/pages/Documents.tsx`

**Interfaces:**
- Consumes: `useClients`, `useCases` (Task 4), `useDocuments` (Task 5), `getDocumentsWithDetails` (Task 3), `DocumentRecord` type (Task 1), `buttonVariants` export from `@/components/ui/button` (existing).
- Produces: no new exports — leaf migration.

- [ ] **Step 1: Write `src/components/dashboard/AddDocument.tsx`**

This file currently exists but is empty. Write it modeled on `AddCase.tsx`'s dialog-form pattern:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useDocuments } from "@/hooks/useDocuments"

import type { DocumentRecord } from "@/types/models"

interface AddDocumentProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const documentTypes: DocumentRecord["type"][] = [
  "Contract",
  "Brief",
  "Invoice",
  "Agreement",
  "Other",
]

interface FormState {
  caseId: string
  clientId: string
  type: DocumentRecord["type"] | ""
  file: File | null
}

const emptyForm: FormState = {
  caseId: "",
  clientId: "",
  type: "",
  file: null,
}

export default function AddDocument({
  open,
  onOpenChange,
}: AddDocumentProps) {
  const { clients } = useClients()
  const { cases } = useCases()
  const { uploadDocument } = useDocuments()
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!formData.clientId) {
      newErrors.clientId = "Client is required"
    }

    if (!formData.caseId) {
      newErrors.caseId = "Case is required"
    }

    if (!formData.type) {
      newErrors.type = "Document type is required"
    }

    if (!formData.file) {
      newErrors.file = "A file is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleReset = () => {
    setFormData(emptyForm)
    setErrors({})
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!validateForm() || !formData.file || !formData.type) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await uploadDocument(formData.file, {
        name: formData.file.name,
        caseId: formData.caseId,
        clientId: formData.clientId,
        type: formData.type,
      })
      handleReset()
      onOpenChange(false)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to upload document"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Attach a file to a client and case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.clientId}
              onValueChange={(value) =>
                setFormData({ ...formData, clientId: value })
              }
            >
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="case">Case *</Label>
            <Select
              value={formData.caseId}
              onValueChange={(value) =>
                setFormData({ ...formData, caseId: value })
              }
            >
              <SelectTrigger id="case">
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((caseItem) => (
                  <SelectItem key={caseItem.id} value={caseItem.id}>
                    {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.caseId && (
              <p className="text-sm text-red-500">{errors.caseId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Document Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  type: value as DocumentRecord["type"],
                })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  file: e.target.files?.[0] ?? null,
                })
              }
              className={errors.file ? "border-red-500" : ""}
            />
            {errors.file && (
              <p className="text-sm text-red-500">{errors.file}</p>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-red-500">{submitError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Replace `src/pages/Documents.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, FileText, Download, Trash2 } from "lucide-react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useDocuments } from "@/hooks/useDocuments"
import { getDocumentsWithDetails } from "@/lib/derived"
import AddDocument from "@/components/dashboard/AddDocument"

export default function Documents() {
  const [open, setOpen] = useState(false)
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const {
    documents: allDocuments,
    loading: documentsLoading,
    deleteDocument,
  } = useDocuments()

  if (clientsLoading || casesLoading || documentsLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const documents = getDocumentsWithDetails(allDocuments, clients, cases)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage and organize all case-related documents and files.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
        <AddDocument open={open} onOpenChange={setOpen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Documents</CardTitle>
          <CardDescription>
            Filter documents by name, case, or type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by document name, case ID, or type..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>All uploaded documents and files</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <FileText className="h-4 w-4" />
                </TableHead>
                <TableHead>Document Name</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.case?.title ?? doc.caseId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell>{doc.uploadedDate}</TableCell>
                    <TableCell>{doc.size}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteDocument(doc.id, doc.storagePath)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No documents found. Upload a new document to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed. **Cannot verify without live credentials:** signing in, uploading a real file to Storage.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/AddDocument.tsx src/pages/Documents.tsx
git commit -m "feat: build document upload UI and migrate Documents page"
```

---

### Task 10: Dashboard migration + retire mockData.ts

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Delete: `src/data/mockData.ts`

**Interfaces:**
- Consumes: `useClients`, `useCases` (Task 4), `useAppointments`, `useDocuments` (Task 5), `getStatistics` (Task 3). Also relies on `RecentCases`/`UpcommingAppointments` already being migrated (Tasks 7, 8) since `Dashboard.tsx` renders both.
- Produces: nothing further depends on this task. After this task, `src/data/mockData.ts` has zero remaining references anywhere in the repo and is deleted.

- [ ] **Step 1: Replace `src/pages/Dashboard.tsx`**

```tsx
import { Briefcase, CalendarDays, FileText, Users } from "lucide-react"

import { StatsCard } from "@/components/dashboard/StatsCard"
import { RecentCases } from "@/components/dashboard/RecentCases"
import { UpcommingAppointments } from "@/components/dashboard/UpcommingAppointments"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useAppointments } from "@/hooks/useAppointments"
import { useDocuments } from "@/hooks/useDocuments"
import { getStatistics } from "@/lib/derived"
import { Link } from "react-router"

export default function Dashboard() {
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const { appointments, loading: appointmentsLoading } = useAppointments()
  const { documents, loading: documentsLoading } = useDocuments()

  if (
    clientsLoading ||
    casesLoading ||
    appointmentsLoading ||
    documentsLoading
  ) {
    return <Skeleton className="h-64 w-full" />
  }

  const statistics = getStatistics(clients, cases, appointments, documents)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <p className="text-muted-foreground">
          Welcome back. Here's an overview of your law firm.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/clients">
          <StatsCard
            title="Total Clients"
            value={statistics.totalClients.toString()}
            description="+12% from last month"
            icon={Users}
          />
        </Link>

        <Link to="/cases">
          <StatsCard
            title="Active Cases"
            value={statistics.activeCases.toString()}
            description="+5 new cases this month"
            icon={Briefcase}
          />
        </Link>

        <Link to="/documents">
          <StatsCard
            title="Documents"
            value={statistics.totalDocuments.toString()}
            description="+28 this month"
            icon={FileText}
          />
        </Link>
        <Link to="/appointments">
          <StatsCard
            title="Appointments"
            value={statistics.upcomingAppointments.toString()}
            description="Upcoming this week"
            icon={CalendarDays}
          />
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <UpcommingAppointments />
        <RecentCases />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the now-unused mock data file**

```bash
rm src/data/mockData.ts
```

- [ ] **Step 3: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed, and none reference `src/data/mockData.ts` (deleting it and having the build still pass confirms every consumer was migrated in Tasks 6-10).

Then run `npm run dev`, confirm the redirect-to-`/login` behavior still works. **Cannot verify without live credentials:** the full signed-in dashboard.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git rm src/data/mockData.ts
git commit -m "feat: migrate Dashboard to Firestore hooks and retire mockData.ts"
```

---

### Task 11: Firestore & Storage security rules

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`
- Create: `firebase.json`

**Interfaces:**
- Consumes: the collection/field names defined in `src/types/models.ts` (Task 1) — `clients`, `cases`, `appointments`, `documents` collections keyed by `ownerId`; `attorneys/{uid}` keyed by the Auth UID; Storage objects at `documents/{ownerId}/...` (Task 5's `uploadDocument`).
- Produces: nothing else in the app depends on these files at build time — they are deployed to the Firebase project directly by the project owner (see Task 12's README section), not consumed by any TypeScript code.

- [ ] **Step 1: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /attorneys/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /clients/{docId} {
      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.ownerId;
    }

    match /cases/{docId} {
      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.ownerId;
    }

    match /appointments/{docId} {
      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.ownerId;
    }

    match /documents/{docId} {
      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.ownerId;
    }
  }
}
```

- [ ] **Step 2: Create `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{ownerId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == ownerId;
    }
  }
}
```

- [ ] **Step 3: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 4: Verify**

There is no build step for `.rules`/`firebase.json` files (deploying them requires the Firebase CLI and the project owner's login — out of scope for this task, see Task 12's README notes). Verify by reading `firestore.rules` back against `src/types/models.ts` (Task 1) and confirming every collection name (`attorneys`, `clients`, `cases`, `appointments`, `documents`) and the `ownerId` field name match exactly.

Run the unrelated full gate to confirm this task didn't touch any TypeScript:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed (unchanged from Task 10 — these are non-TS files).

- [ ] **Step 5: Commit**

```bash
git add firestore.rules storage.rules firebase.json
git commit -m "feat: add Firestore and Storage security rules scoped by ownerId"
```

---

### Task 12: Admin SDK seed script + README

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add a `seed` script)
- Modify: `README.md`

**Interfaces:**
- Consumes: `firebase-admin` (installed in Task 1). Does not import anything from `src/` — it's a standalone Node script with its own literal copies of the old mock data (kept intentionally separate from `src/types/models.ts` so the app's client-side types never import `firebase-admin`).
- Produces: `npm run seed` — nothing else in the app depends on this task.

- [ ] **Step 1: Create `scripts/seed.ts`**

```typescript
import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  path.join(__dirname, "serviceAccountKey.json")

if (!existsSync(serviceAccountPath)) {
  console.error(
    `Service account key not found at ${serviceAccountPath}.\n` +
      "Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in scripts/."
  )
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"))

initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const db = getFirestore()

const SEED_MARKER_COLLECTION = "_seed"
const SEED_MARKER_DOC = "status"
const SEED_PASSWORD = "JusTimCase-Seed-2026!"

const mockAttorneys = [
  {
    name: "John Doe",
    specialization: "Criminal & Civil Law",
    email: "john.doe@justimcase.dev",
  },
  {
    name: "Sarah Johnson",
    specialization: "Family & Estate Law",
    email: "sarah.johnson@justimcase.dev",
  },
  {
    name: "Michael Chen",
    specialization: "Corporate & Commercial Law",
    email: "michael.chen@justimcase.dev",
  },
]

const mockClients = [
  { id: "CLT-001", name: "James Smith", email: "james.smith@email.com", phone: "(555) 123-4567" },
  { id: "CLT-002", name: "Maria Johnson", email: "maria.johnson@email.com", phone: "(555) 234-5678" },
  { id: "CLT-003", name: "Robert Williams", email: "robert.williams@email.com", phone: "(555) 345-6789" },
  { id: "CLT-004", name: "Rosa Fernandez", email: "rosa.fernandez@email.com", phone: "(555) 678-9012" },
]

const mockCases = [
  { id: "CASE-001", title: "Smith v. Johnson", clientId: "CLT-001", type: "Civil", status: "Active", openDate: "2024-01-15" },
  { id: "CASE-002", title: "Johnson Property Dispute", clientId: "CLT-002", type: "Property", status: "Pending", openDate: "2024-02-10" },
  { id: "CASE-003", title: "Williams Personal Injury Claim", clientId: "CLT-003", type: "Personal Injury", status: "Closed", openDate: "2024-03-05" },
  { id: "CASE-004", title: "Fernandez Family Matter", clientId: "CLT-004", type: "Family", status: "Active", openDate: "2024-04-12" },
]

const mockAppointments = [
  { id: "APT-001", clientId: "CLT-001", caseId: "CASE-001", type: "Initial Consultation", date: "2024-09-15", time: "10:00 AM", status: "Scheduled", location: "Office A" },
  { id: "APT-002", clientId: "CLT-002", caseId: "CASE-002", type: "Case Review", date: "2024-09-16", time: "11:30 AM", status: "Scheduled", location: "Office B" },
  { id: "APT-003", clientId: "CLT-003", caseId: "CASE-003", type: "Settlement Meeting", date: "2024-09-17", time: "2:00 PM", status: "Completed", location: "Conference Room 1" },
  { id: "APT-004", clientId: "CLT-004", caseId: "CASE-004", type: "Client Consultation", date: "2024-09-18", time: "9:30 AM", status: "Scheduled", location: "Office B" },
]

const mockDocuments = [
  { id: "DOC-001", name: "Settlement Agreement", caseId: "CASE-001", clientId: "CLT-001", type: "Agreement", uploadedDate: "2024-09-10", size: "2.4 MB", url: "/documents/settlement-agreement.pdf" },
  { id: "DOC-002", name: "Case Brief", caseId: "CASE-002", clientId: "CLT-002", type: "Brief", uploadedDate: "2024-09-11", size: "1.8 MB", url: "/documents/case-brief.pdf" },
  { id: "DOC-003", name: "Contract", caseId: "CASE-001", clientId: "CLT-001", type: "Contract", uploadedDate: "2024-09-08", size: "3.1 MB", url: "/documents/contract.pdf" },
  { id: "DOC-004", name: "Invoice", caseId: "CASE-003", clientId: "CLT-003", type: "Invoice", uploadedDate: "2024-09-12", size: "0.5 MB", url: "/documents/invoice.pdf" },
  { id: "DOC-005", name: "Property Deed", caseId: "CASE-002", clientId: "CLT-002", type: "Other", uploadedDate: "2024-09-09", size: "2.7 MB", url: "/documents/property-deed.pdf" },
  { id: "DOC-006", name: "Family Agreement", caseId: "CASE-004", clientId: "CLT-004", type: "Agreement", uploadedDate: "2024-09-13", size: "1.2 MB", url: "/documents/family-agreement.pdf" },
]

async function main() {
  const force = process.argv.includes("--force")

  const markerRef = db.collection(SEED_MARKER_COLLECTION).doc(SEED_MARKER_DOC)
  const marker = await markerRef.get()
  if (marker.exists && !force) {
    console.error(
      "Seed marker already exists — refusing to re-seed. Pass --force to override."
    )
    process.exit(1)
  }

  const attorneyUids: string[] = []
  for (const attorney of mockAttorneys) {
    const userRecord = await auth.createUser({
      email: attorney.email,
      password: SEED_PASSWORD,
      displayName: attorney.name,
    })
    await db.collection("attorneys").doc(userRecord.uid).set({
      name: attorney.name,
      specialization: attorney.specialization,
      email: attorney.email,
    })
    attorneyUids.push(userRecord.uid)
    console.log(`Created attorney ${attorney.name} (${userRecord.uid})`)
  }

  const ownerFor = (index: number) => attorneyUids[index % attorneyUids.length]

  const batch = db.batch()

  mockClients.forEach((client, i) => {
    const { id, ...data } = client
    batch.set(db.collection("clients").doc(id), {
      ...data,
      ownerId: ownerFor(i),
    })
  })

  mockCases.forEach((c, i) => {
    const { id, ...data } = c
    batch.set(db.collection("cases").doc(id), {
      ...data,
      ownerId: ownerFor(i),
    })
  })

  mockAppointments.forEach((a, i) => {
    const { id, ...data } = a
    batch.set(db.collection("appointments").doc(id), {
      ...data,
      ownerId: ownerFor(i),
    })
  })

  mockDocuments.forEach((d, i) => {
    const { id, ...data } = d
    batch.set(db.collection("documents").doc(id), {
      ...data,
      storagePath: "",
      ownerId: ownerFor(i),
    })
  })

  await batch.commit()
  await markerRef.set({ seededAt: new Date().toISOString() })

  console.log("Seed complete.")
  console.log(`Seeded attorney login password: ${SEED_PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add the `seed` script to `package.json`**

In `package.json`, add this entry to `"scripts"` (alongside the existing `dev`/`build`/`lint`/`format`/`typecheck`/`preview` entries):

```json
"seed": "tsx scripts/seed.ts"
```

- [ ] **Step 3: Write `README.md`**

Replace the full contents of `README.md` (currently empty):

```markdown
# JusTimCase

A legal case-management dashboard for a small law firm — clients, cases, appointments, and documents — backed by Firebase (Auth, Firestore, Storage).

## Development

```bash
npm install
npm run dev
```

## Firebase Setup

This app needs a real Firebase project to run against. It has none configured by default — every `VITE_FIREBASE_*` variable is empty until you supply your own.

1. Create a project at the [Firebase console](https://console.firebase.google.com/).
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Firestore** database (any region, start in production mode — the rules in `firestore.rules` lock it down).
4. Create a **Storage** bucket (the rules in `storage.rules` lock it down).
5. In Project Settings → General → Your apps, add a **Web app** and copy its config values into a `.env` file at the repo root (copy `.env.example` to `.env` first, then fill in the six `VITE_FIREBASE_*` values).
6. Deploy the security rules (requires the [Firebase CLI](https://firebase.google.com/docs/cli), `firebase login`, and `firebase use <your-project-id>` first):
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

## Seeding Data

To populate the app with the original demo data (3 attorneys, 4 clients, 4 cases, 4 appointments, 6 documents):

1. In Project Settings → Service Accounts, generate a new private key and save it as `scripts/serviceAccountKey.json` (git-ignored — never commit this file), or set `GOOGLE_APPLICATION_CREDENTIALS` to its path.
2. Run:
   ```bash
   npm run seed
   ```
3. The script prints the 3 seeded attorney emails and a shared password — use either to sign in at `/login`.

Re-running `npm run seed` refuses to run twice (it writes a `_seed/status` marker). Pass `--force` to re-seed anyway.
```

- [ ] **Step 4: Verify**

Run:
```bash
npm run typecheck
npm run lint
npm run build
```
Expected: all three succeed (the seed script is excluded from the app's TypeScript project via `tsconfig.app.json`'s `include: ["src"]`, so it isn't type-checked by `npm run typecheck` — that's expected; `tsx` type-checks nothing at runtime either, it transpiles only). **Cannot verify without live credentials:** actually running `npm run seed` — that needs a real service account key.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts package.json README.md
git commit -m "feat: add Firebase Admin SDK seed script and setup README"
```
