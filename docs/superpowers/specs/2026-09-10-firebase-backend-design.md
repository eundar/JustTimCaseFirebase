# Firebase Backend for JusTimCase — Design Spec

Date: 2026-09-10
Status: Approved for planning

## 1. Problem

JusTimCase is a React + Vite + TypeScript legal case-management dashboard. All
data currently lives in `src/data/mockData.ts` as static in-memory arrays
(`attorneys`, `clients`, `cases`, `appointments`, `documents`) plus a
`selectors` object of pure query/derivation functions. Thirteen components
read through `selectors` directly:

- `src/components/dashboard/AddCase.tsx`
- `src/components/dashboard/AddClient.tsx`
- `src/components/dashboard/AddDocument.tsx` (currently an **empty stub** —
  no upload UI exists yet)
- `src/components/dashboard/ScheduleAppointment.tsx`
- `src/components/dashboard/CaseProfile.tsx`
- `src/components/dashboard/ClientProfile.tsx`
- `src/components/dashboard/RecentCases.tsx`
- `src/components/dashboard/StatsCard.tsx`
- `src/components/dashboard/UpcommingAppointments.tsx`
- `src/pages/Cases.tsx`
- `src/pages/Clients.tsx`
- `src/pages/Appointments.tsx`
- `src/pages/Documents.tsx`
- `src/pages/Dashboard.tsx`

There is no authentication, no route guarding, and no persistence — a page
refresh loses any in-session change (forms currently take an `onAdd*` prop
callback with nowhere durable to write to).

Goal: replace the mock data layer with a real Firebase backend (Auth +
Firestore + Storage) with minimal churn to the 13 consumers, while adding
per-attorney data scoping and real document upload.

## 2. Decisions

These were settled during brainstorming and are binding for the plan:

1. **Auth: Firebase Auth, per-attorney scoping.** Email/password sign-up and
   sign-in. Every `client`/`case`/`appointment`/`document` record carries an
   `ownerId` (the creating attorney's Firebase Auth UID), and each attorney
   only ever sees their own records.
2. **Document storage: real uploads.** `AddDocument.tsx` gets built out (it's
   currently empty) to upload a file to Firebase Storage and store the
   resulting metadata + download URL in Firestore.
3. **Data freshness: real-time.** Firestore reads use `onSnapshot` listeners,
   not one-shot fetches — lists and the dashboard update live.
4. **Seed data: yes.** A one-time Admin SDK script seeds Firestore from the
   current contents of `mockData.ts`, including creating the 3 mock
   attorneys as real Firebase Auth accounts.
5. **Firebase project setup: user-owned.** The user creates the Firebase
   console project, enables Auth/Firestore/Storage, and supplies the web app
   config and an Admin SDK service account key later. All code is written
   against environment variables so it works the moment real config is
   supplied — implementation does not block on having a live project.
6. **Data-access layer shape: React Context + hooks.** One `AuthContext` for
   the signed-in attorney, plus one custom hook per collection wrapping
   `onSnapshot`. No separate service-module indirection layer — this most
   closely matches how `selectors` is used today.

## 3. Firestore data model

Top-level collections, each record scoped by `ownerId` (no subcollections —
keeps queries a single `where('ownerId', '==', uid)`):

```
attorneys/{uid}
  name: string
  specialization: string
  email: string

clients/{clientId}
  ownerId: string        // attorney UID
  name: string
  email: string
  phone: string

cases/{caseId}
  ownerId: string
  title: string
  clientId: string       // -> clients/{clientId}
  type: string
  status: "Active" | "Pending" | "Closed"
  openDate: string        // ISO date

appointments/{appointmentId}
  ownerId: string
  clientId: string
  caseId: string | null
  type: string
  date: string             // ISO date
  time: string
  status: "Scheduled" | "Confirmed" | "Completed" | "Pending"
  location: string

documents/{documentId}
  ownerId: string
  name: string
  caseId: string
  clientId: string
  type: "Contract" | "Brief" | "Invoice" | "Agreement" | "Other"
  uploadedDate: string
  size: string              // human-readable, e.g. "2.4 MB"
  url: string                // Storage download URL
  storagePath: string        // Storage object path, for deletion
```

`attorneys/{uid}` document ID **is** the Firebase Auth UID — no separate
attorney ID scheme.

### Firestore security rules (informative — final rules are a plan task)

```
match /attorneys/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /{collection}/{docId} where collection in ['clients','cases','appointments','documents'] {
  allow read, update, delete: if request.auth != null
    && request.auth.uid == resource.data.ownerId;
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.ownerId;
}
```

(Firestore rules don't support a literal `where collection in [...]`
shorthand — the plan should expand this to one `match` block per
collection, identical body.)

### Storage layout & rules

```
documents/{ownerId}/{documentId}/{filename}
```

```
match /documents/{ownerId}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == ownerId;
}
```

## 4. Auth flow

- New route `/login` (outside the `App` layout — no sidebar/header) with a
  single form that toggles between sign-in and sign-up. Sign-up additionally
  collects `name` and `specialization` and creates the `attorneys/{uid}`
  profile doc immediately after `createUserWithEmailAndPassword` succeeds.
- `AuthContext` (`src/context/AuthContext.tsx`) wraps the router root,
  exposing `{ user, attorneyProfile, loading, signUp, signIn, signOut }`. It
  subscribes to `onAuthStateChanged` once and derives `attorneyProfile` via a
  one-time `getDoc` on `attorneys/{uid}` (profile data doesn't need
  real-time sync).
- Route guard: `App.tsx` (the layout route) checks `useAuth()`; while
  `loading` render nothing (or a spinner), if no `user` redirect to
  `/login` via `<Navigate>`, otherwise render the existing layout +
  `<Outlet />` unchanged.
- `AppHeader.tsx` gets a sign-out control wired to `signOut()` from
  `AuthContext` (currently has no such control — the plan should locate the
  right spot, e.g. next to the existing avatar element).

## 5. Data-access layer

Replaces `src/data/mockData.ts` entirely except for the **type
definitions** (`Client`, `Case`, `Appointment`, `Document`), which move to
`src/types/models.ts` unchanged (consumers importing `type { Case } from
"@/data/mockData"` switch to `"@/types/models"`).

New file `src/lib/firebase.ts`: initializes the Firebase app + exports
`auth`, `db`, `storage` singletons, reading config from `import.meta.env`:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

(`.env` is git-ignored; `.env.example` lists the keys with empty values.)

One hook per collection in `src/hooks/`, each following the same shape —
subscribes to `onSnapshot(query(collection(db, X), where('ownerId','==',
uid)))` scoped to the current `AuthContext` user, and exposes mutations:

- `useClients()` → `{ clients, loading, error, addClient, updateClient, deleteClient }`
- `useCases()` → `{ cases, loading, error, addCase, updateCase, deleteCase }`
- `useAppointments()` → `{ appointments, loading, error, addAppointment, updateAppointment, deleteAppointment }`
- `useDocuments()` → `{ documents, loading, error, uploadDocument, deleteDocument }`
  - `uploadDocument(file: File, metadata: { name, caseId, clientId, type })`
    uploads to Storage at `documents/{uid}/{autoId}/{file.name}`, then writes
    the Firestore record (`size` derived from `file.size`, `uploadedDate`
    from `new Date()`, `url`/`storagePath` from the completed upload).

Derived/joining helpers replace the corresponding `selectors.*` functions,
implemented as **pure functions taking already-fetched arrays** (not their
own hooks/subscriptions) so components that already call two collection
hooks can compose them without double-subscribing:

- `getClientById(clients, id)`, `getCaseById(cases, id)`,
  `getCasesByClientId(cases, clientId)`, `getAppointmentsByClientId(...)`,
  `getDocumentsByCaseId(...)`, `getDocumentsByClientId(...)` — direct
  ports of today's `selectors.*` filters/finds.
- `getCasesWithDetails(cases, clients)`, `getAppointmentsWithDetails(appointments, clients, cases)`,
  `getDocumentsWithDetails(documents, clients, cases)` — direct ports of
  today's join selectors.
- `getRecentCases(cases, clients, limit = 4)` — port of today's
  `selectors.getRecentCases`, operating on live hook data instead of the
  static array.
- `getStatistics(clients, cases, appointments, documents)` — port of
  `selectors.getStatistics`.

These live in `src/lib/derived.ts` as plain exported functions (no
hook-of-hooks, no extra subscriptions) — the plan should name the exact
file layout for hooks vs. this helper module, but the acceptance bar is:
**every current `selectors.X(...)` call site has a direct equivalent taking
the same conceptual input**, so component bodies change their data source,
not their logic.

## 6. Component migration (13 consumers)

Every consumer currently does `import { selectors } from "@/data/mockData"`
(or imports a type from it). The migration for each is mechanical:

- Replace the `mockData` import with the relevant hook(s) from `src/hooks/`
  and, where a join/derived selector was used, the matching function from
  `src/lib/derived.ts`.
- Replace `type { Case } from "@/data/mockData"` (etc.) with
  `"@/types/models"`.
- Where a component currently takes an `onAddCase?: (data) => void` callback
  prop and the parent manages the mock array in local state, the callback is
  replaced by calling the hook's mutation directly inside the form
  component (e.g. `AddCase.tsx` calls `addCase(formData)` from `useCases()`
  on submit instead of calling `onAddCase?.(formData)`), and the `open` /
  `onOpenChange` dialog-visibility props are kept as-is.
- Loading state: each consumer needs to handle `loading` from its hook(s) —
  the plan should specify a consistent minimal treatment (e.g. render
  existing skeleton components from `src/components/ui/skeleton.tsx` where a
  list is loading) rather than leaving it unhandled.
- `AddDocument.tsx` is net-new UI (file input + case/client select +
  document type select, modeled on `AddCase.tsx`'s existing form
  patterns), since the current file is empty.

## 7. Seeding

A standalone Node script (`scripts/seed.ts`, run with `tsx` or `ts-node`,
**not** part of the Vite app bundle) using the Firebase Admin SDK:

1. Reads a service account key path from `GOOGLE_APPLICATION_CREDENTIALS`
   or a `scripts/serviceAccountKey.json` (git-ignored).
2. Creates 3 Firebase Auth users from the current mock `attorneys` array
   (email = a generated placeholder, e.g. `john.doe@justimcase.dev`;
   password = a fixed dev-only seed password printed to the console) and
   their `attorneys/{uid}` profile docs.
3. Distributes the mock `clients`/`cases`/`appointments`/`documents` across
   the 3 seeded attorney UIDs (round-robin is acceptable) as their
   `ownerId`, and writes them into Firestore with the Admin SDK (which
   bypasses security rules).
4. Is idempotent-safe-enough for a prototype: the plan should have it check
   for an existing marker doc (e.g. `_seed/status`) and refuse to run twice
   without a `--force` flag, rather than silently duplicating data.

Document records keep their existing mock `url` (no real file behind them)
unless the plan chooses to also seed real Storage objects — out of scope
here; flag it as a plan decision if the reviewer thinks it matters.

## 8. Error handling

- Auth: sign-in/sign-up forms surface Firebase Auth error codes
  (`auth/email-already-in-use`, `auth/wrong-password`, etc.) as
  human-readable messages, not raw error objects.
- Hooks: `onSnapshot`'s error callback sets the hook's `error` state;
  consumers already showing a list should render a simple inline error
  state rather than crashing (no error boundary work is in scope here
  beyond what any given page already does today, which is none — the plan
  should not introduce a global error boundary unless a task explicitly
  calls for it).
- Uploads: `uploadDocument` surfaces Storage errors (e.g. quota,
  permission-denied) back to the calling form the same way validation
  errors are surfaced today (inline message near the submit button).

## 9. Testing

No test framework exists in this project today (`package.json` has no test
script or test runner dependency). This spec does not mandate introducing
one. Verification for this work is manual: running `npm run dev` against
either the Firebase Local Emulator Suite or a real project, exercising
sign-up/sign-in, CRUD on each collection, and a document upload end to end.
If the implementation plan wants automated coverage for the pure functions
in `src/lib/derived.ts` (they take/return plain data, no Firebase calls
needed to test them), that's a reasonable addition the plan can call out
explicitly — it is not assumed here.

## 10. Out of scope

- Multi-attorney case assignment / sharing records between attorneys.
- Password reset / email verification flows.
- Offline support / Firestore persistence cache tuning.
- CI/CD or Firebase Hosting deployment.
- Re-uploading seeded documents' mock URLs as real Storage objects.
