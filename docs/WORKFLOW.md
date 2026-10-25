# LegalFlow: System Workflow and Technical Overview

**Project:** LegalFlow — A Bespoke Legal Practice Management System with Frictionless Public Intake for Burdeos Law Office (Sorsogon City)  
**Document purpose:** Explain the application architecture and end-to-end workflows evidenced in the current repository.  
**Implementation status:** This document describes the checked-out React/Firebase implementation, not an assumed or planned backend.

> **Important scope and accuracy note**
>
> The requested architecture described as React/Vite + Node.js/Express + PostgreSQL/Prisma, with Puppeteer and Nodemailer, does not match the application present in this repository. The code currently uses React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, and Cloud Storage. No Express server, PostgreSQL schema, Prisma models, Puppeteer document engine, Nodemailer SMTP integration, case notes, task system, financial ledger, or relational `CLIENT_CASE_MAP` table was found in the inspected project. Accordingly, the workflows below distinguish implemented behavior from requirements that are not currently implemented. The name and institutional purpose in this title are the project identity supplied by the requester; the technical details are grounded in repository code.

## 1. System Overview & Purpose

LegalFlow (the application branded in the code as **JusTimCase**) is a browser-based legal practice management application for Burdeos Law Office. Its implemented features support attorney account access, client and case records, appointments, document uploads, and a public prospective-client intake form with an internal intake review queue.

The current software supports an authenticated attorney account model. The UI has no separate **Lawyer** and **Assistant** roles or corresponding role-specific permissions. Intake review is additionally gated by a trusted Firebase Authentication custom claim named `intakeReviewer`, together with an attorney profile. Do not interpret this claim as a general Assistant role: it specifically gates access to the shared intake queue.

The implemented operational goals are:

- Let prospective clients submit an intake request without signing in.
- Let authorized intake reviewers inspect submissions, check potential name conflicts, and accept or decline submissions.
- Allow signed-in attorneys to maintain their own client, case, appointment, and document records.
- Associate cases and uploaded documents with client/case identifiers in application data.
- Enforce access restrictions in Firebase security rules as well as in the browser application.

This is a description of the current code and workspace configuration, not confirmation that the Firebase rules or application have been deployed or tested against a production project.

## 2. Core System Architecture & Tech Stack

### 2.1 Implemented architecture

The application is a **Clean Architecture-inspired client application**, not the four-layer Express/PostgreSQL design proposed in the request. Its actual high-level flow is:

```text
Browser user
    ↓
React routes, pages, and components
    ↓
React hooks and (for intake workflows) an application service
    ↓
Firebase repositories and Firebase client SDK
    ↓
Firebase Authentication / Cloud Firestore / Cloud Storage
```

The code has domain models and runtime parsers, repositories, an application service for intake, and presentation components. It is not fully dependency-inverted: repositories use Firebase SDK singletons from `src/lib/firebase.ts`, most CRUD hooks import concrete repositories, and `AuthContext` directly accesses Firestore for attorney profiles.

| Area | Actual technology or module | Responsibility |
|---|---|---|
| Client/runtime | Web browser | Hosts the React application and Firebase client SDK. |
| Presentation | React 19, TypeScript, Vite, React Router, Tailwind CSS | Route handling, page rendering, forms, component state, and user interaction. |
| Application workflows | `src/application/services/IntakeService.ts` | Coordinates intake submission/review and conflict checks. No general Express/API application server is present. |
| Domain | `src/domain/models/` | Shared TypeScript records and runtime parsing/validation for persisted data. |
| Data/infrastructure | `src/data/repositories/`, Firebase SDK | Firestore CRUD/subscriptions, Storage document upload/delete, owner checks, parsing, and operation errors. |
| Identity and access | Firebase Authentication, `firestore.rules`, `storage.rules` | User sign-in and server-enforced data authorization. |
| PDF rendering | Not present | No Puppeteer dependency or PDF generation flow was found. |
| Email alerts | Not present | No Nodemailer/SMTP integration or outbound email workflow was found. |

The package scripts are in `package.json`. The documented checks include `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. The production build runs TypeScript project checks and Vite. The GitHub Actions workflow `.github/workflows/ci.yml` runs `npm ci`, lint, tests, and build using Node.js 22.

### 2.2 Application initialization and routes

`src/main.tsx` mounts React providers in this order: `StrictMode`, `ErrorBoundary`, `ThemeProvider`, `AuthProvider`, `Suspense`, and `RouterProvider`. `src/router.tsx` defines public landing and intake pages, login, and the authenticated `/app` route with child pages:

- `/` — landing page.
- `/client-intake-form` — public intake page (the current URL is not `/intake`).
- `/login` — sign-in page.
- `/app` — authenticated dashboard shell.
- `/app/clients`, `/app/cases`, `/app/documents`, `/app/appointments`, `/app/intakeforms`, `/app/settings` — feature routes.

Pages are lazy-loaded from the router. The `/app` shell in `src/App.tsx` redirects signed-out users to `/login`; Firebase rules provide the actual backend authorization.

### 2.3 Main module boundaries

- `src/pages/` contains route-level presentation and user flows.
- `src/components/dashboard/` contains feature components, forms, and dialogs.
- `src/components/ui/` contains shared visual primitives.
- `src/hooks/` connects React state and Firebase-backed operations.
- `src/application/services/IntakeService.ts` contains multi-repository intake logic.
- `src/data/repositories/` contains Firestore repositories and document Storage behavior.
- `src/domain/models/index.ts` defines `Client`, `Case`, `Appointment`, `DocumentRecord`, `ProspectiveClient`, and related types.
- `src/domain/models/validation.ts` parses and validates Firestore values at runtime.
- `src/lib/firebase.ts` initializes Firebase Authentication, Firestore, and Storage SDK instances.
- `firestore.rules` and `storage.rules` define backend authorization.

## 3. Detailed User Workflows (Step-by-Step)

### Workflow A: Public Intake & Lead Conversion — Implemented

1. **Prospective client opens the public form.** The configured URL is `/client-intake-form`, served by `src/pages/ClientIntakeForm.tsx`. It is outside the authenticated `/app` route. The requested `/intake` path is not currently registered.
2. **Prospective client enters intake details.** The page collects name, email, phone, case type, description, optional opposing party, and acceptance of the privacy agreement. The page prevents submission when the privacy agreement has not been accepted.
3. **The browser calls the intake hook and application service.** `ClientIntakeFormPage` calls `addProspectiveClient` from `useProspectiveClients()` in `src/hooks/useClientIntakeForm.ts`. That method delegates to `intakeService.submit()` in `src/application/services/IntakeService.ts`.
4. **The repository creates a Firestore document.** `ProspectiveClientRepository.createPublic()` writes to the `prospectiveClients` collection, adds status `Pending Review`, and adds an ISO `createdAt` timestamp. There is no Express endpoint or `PENDING_INTAKES` SQL table in this implementation.
5. **Firestore rules validate the public create shape.** The `prospectiveClients` create rule in `firestore.rules` uses field allowlists and checks field types, selected case type, privacy acceptance, status, and length constraints. The client-side form is not itself the security boundary. The repository code does not implement a separate general-purpose sanitization middleware; do not characterize it as server-side HTML sanitization.
6. **An authorized reviewer opens the intake queue.** The queue is `/app/intakeforms`, rendered by `src/pages/IntakeForm.tsx`. `useProspectiveClients()` subscribes through `ProspectiveClientRepository`. Review access requires an authenticated user with a valid attorney profile and trusted `intakeReviewer` claim; the repository checks the claim and `firestore.rules` enforce it independently.
7. **Reviewer checks a possible conflict.** The UI invokes `IntakeService.checkConflict()`, which compares normalized intake names and opposing parties with the authenticated attorney's client names and names/parties from other intake submissions. The result is a potential-name match, not an automated legal conflict determination.
8. **Reviewer accepts or declines.** Acceptance calls `ProspectiveClientRepository.accept()`, which uses a Firestore transaction to confirm the intake exists and is still `Pending Review`, create a `clients` record with the reviewing attorney's `ownerId`, and update the intake status to `Accepted`. Decline similarly changes a pending record to `Declined` in a transaction. Rules allow only the permitted status transition and restrict changed fields.

**Data created by approval:** A client document is added to Firestore's `clients` collection; the intake record remains in `prospectiveClients` with its updated status. The current implementation does not insert into `CLIENT_CASE_MAP`, and it does not create a case automatically.

**Important scope limitation:** The intake queue is shared among approved reviewers; there is no per-attorney intake assignment in the current model or rules. `docs/security/intake-reviewer-approval.md` describes how the trusted reviewer claim is granted/revoked.

### Workflow B: Case Management & Documentation — Partially Implemented

4. **Attorney creates a case.** The `/app/cases` page (`src/pages/Cases.tsx`) opens `src/components/dashboard/AddCase.tsx`. The form collects a case title, client, case type, status, and open date. `useCases()` writes through `CaseRepository`, which extends `OwnedFirestoreRepository<Case>`. The record includes an `ownerId`, `clientId`, and `clientName`.

   The current case model does **not** include a docket number, court designation, or opposing counsel field; it includes an optional `opposingParty`. No separate Assistant account or role is provided. The browser form requires a client selection, but the case model stores the client identifier rather than a relational database foreign key. Firestore does not enforce a PostgreSQL-style foreign key.

5. **Case notes.** A time-stamped `CASE_NOTES` module/table and case note entry workflow were not found in the current repository. This step is therefore not an implemented workflow.

6. **Document handling.** The `/app/documents` page uses `src/hooks/useDocuments.ts` and `DocumentRepository`. `AddDocument` uploads a selected file to Firebase Storage under `documents/{ownerId}/{documentId}/{safeFileName}`, obtains a download URL, and writes metadata (name, type, case/client IDs, date, size, URL, storage path) to Firestore's `documents` collection. The repository attempts to clean up a successfully uploaded file if subsequent metadata creation fails.

   This is file upload/download management, not a document template engine. No baseline legal templates, variable population, Puppeteer process, or generated printable PDF workflow was found.

### Workflow C: Calendar, Hearings & Task Tracking — Partially Implemented

7. **Staff schedules an appointment.** The `/app/appointments` page can open `ScheduleAppointment` in `src/components/dashboard/ScheduleAppointment.tsx`. The form requires a client, appointment type, date, time, and location. It rejects a date in the past and sets a new appointment's status to `Scheduled`. The `caseId` field is optional in the form and in the `Appointment` model; it is not a mandatory active-case foreign key.
8. **Calendar, reminders, and alerts.** Appointment records are stored in Firestore and displayed by the appointments page. The current model has no hearing-specific record, task/deadline entity, scheduled reminder process, or notification collection in use. No visual deadline banner workflow or Nodemailer/SMTP email sender was found. The browser displays errors/loading and page content, but that is not an approaching-deadline alert system.

### Workflow D: Financial Ledger Logging — Not Implemented

9. **Case-specific disbursements and summaries.** No `CASE_EXPENSES` collection/model, expense form, ledger repository, or aggregate expense summary was found in the current codebase. Filing fees, notary costs, travel expenses, and per-case financial reporting are not currently documented as supported application behavior.

## 4. Role-Based Access Control (RBAC) & Security

### 4.1 Authentication

`src/context/AuthContext.tsx` uses Firebase Authentication email/password APIs. It listens for auth-state changes, stores the Firebase user, and loads an `attorneys/{uid}` Firestore profile using the runtime `parseAttorneyProfile()` parser. The profile shape contains `name`, `specialization`, and `email`.

The repository does not use JWT middleware in an Express server. Firebase Authentication issues and manages Firebase ID tokens; repository operations use the Firebase client SDK, and Firestore/Storage security rules evaluate the authenticated request. No bcrypt dependency or application-managed password hashing code was identified. Password handling belongs to Firebase Authentication rather than a local `USERS` table.

### 4.2 Authorization rules

- The `/app` route redirects unauthenticated browser users to `/login`. This improves navigation but is not backend authorization.
- Firestore rules restrict `clients`, `cases`, `appointments`, and `documents` to authenticated attorneys whose UID matches the record's `ownerId`. Updates must preserve the original owner.
- Storage paths under `documents/{ownerId}/...` require the authenticated UID to match the path owner.
- Intake submission is public but constrained by Firestore field/type/length checks.
- Intake review reads and status updates require both an existing attorney profile and the trusted `intakeReviewer` custom claim.
- The claim is managed using the trusted Admin SDK script `scripts/manage-intake-reviewer.ts`, invoked by `npm run intake-reviewer -- <firebase-uid> <grant|revoke>`. Admin credentials must remain outside the browser and repository.

### 4.3 Lawyer and Assistant access

The requested Lawyer/Assistant role split and shared account session model are not implemented as separate application roles. The current profile and rules describe an attorney identity, with an additional intake-reviewer claim for the shared intake queue. There is no Assistant role field or role-specific page/operation authorization.

If Lawyer and Assistant permissions are required, this is a security and data-model change: define trusted role provisioning, identify actions permitted for each role, enforce permissions in Firebase rules (not only in the UI), and add authorization tests. Avoid treating a shared username/password as an equivalent to per-user auditability or authorization.

### 4.4 Verification limitations

`firebase.json` points to `firestore.rules` and `storage.rules`, but no Firebase Emulator Suite test configuration was found. `docs/report.md` records that rules are not yet emulator-verified or confirmed deployed. Frontend tests that mock Firebase functions do not establish security-rule correctness. Rule behavior must be separately tested against the emulator and confirmed in the target Firebase project before release.

## 5. Database Entity Summary

### 5.1 Actual persistence model

The current application uses **Cloud Firestore document collections and Cloud Storage objects**, not PostgreSQL relational tables or Prisma models. The Firestore rules define or govern these collections:

| Firestore collection / storage area | Purpose and key fields evidenced in code |
|---|---|
| `attorneys` | Profile documents keyed by UID; `name`, `specialization`, `email`. |
| `clients` | Attorney-owned client records; `ownerId`, `name`, `email`, `phone`. |
| `cases` | Attorney-owned case records; `ownerId`, `title`, `clientId`, `clientName`, optional `opposingParty`, type, status, open date. |
| `appointments` | Attorney-owned appointments; `ownerId`, `clientId`, optional `caseId`, type, date, time, status, location. |
| `documents` | Attorney-owned document metadata; client/case IDs, type, uploaded date, size, download URL, and Storage path. |
| `prospectiveClients` | Public intake submissions and review status; contact details, case type/description, privacy acceptance, optional opposing party, status, and creation time. |
| Firebase Storage `/documents/{ownerId}/...` | Uploaded file objects, scoped by owner UID in `storage.rules`. |

Relationships such as `clientId` and `caseId` are application-level string identifiers. The current code joins records in memory in `src/lib/derived.ts` (for example, cases with clients and documents with cases/clients); Firestore does not provide SQL foreign key constraints for these records. The appointment form intentionally permits no case link.

The code's TypeScript domain model includes six persisted record/profile types (`AttorneyProfile`, `Client`, `Case`, `Appointment`, `DocumentRecord`, `ProspectiveClient`) plus conflict-result types. This should not be confused with the requested list of eleven SQL tables.

### 5.2 Requested relational tables not found in the current implementation

The following names were specified in the requested target design but were not found as current PostgreSQL tables, Prisma models, or Firestore collections:

| Requested table | Current repository status |
|---|---|
| `USERS` | No local users table/model; Firebase Authentication provides identity, with attorney profiles in `attorneys`. |
| `PENDING_INTAKES` | Intake records are in Firestore `prospectiveClients`, with a status field. |
| `CLIENTS` | Implemented as the Firestore `clients` collection, not a SQL table. |
| `CASES` | Implemented as the Firestore `cases` collection, not a SQL table. |
| `CLIENT_CASE_MAP` | No mapping table; each case has a `clientId` field. |
| `HEARINGS` | No hearing collection/model found; appointments are implemented. |
| `TASKS` | No task collection/model found. |
| `CASE_NOTES` | No case note collection/model found. |
| `CASE_EXPENSES` | No expense collection/model found. |
| `DOCUMENT_TEMPLATES` | No document-template collection/model found; uploaded documents are supported. |
| `NOTIFICATIONS` | No notification collection/model or deadline alert workflow found. |

If these entities represent approved capstone requirements, they should be treated as planned scope until implemented with data models, persistence, authorization rules, UI workflows, and tests. Do not present them as current database entities during a technical review of this repository.

## 6. End-to-End Module Interaction Summary

### Public intake path

```text
Browser at /client-intake-form
  → ClientIntakeFormPage
  → useProspectiveClients()
  → IntakeService.submit()
  → ProspectiveClientRepository.createPublic()
  → Firestore prospectiveClients collection
  → firestore.rules public-create validation
```

### Intake review and conversion path

```text
Authenticated reviewer at /app/intakeforms
  → App and AuthContext
  → IntakeForm page
  → useProspectiveClients()
  → IntakeService (conflict checks / workflow delegation)
  → ProspectiveClientRepository + ClientRepository
  → reviewer claim and attorney UID checks
  → Firestore transaction creates owned client and updates intake status
  → firestore.rules independently authorize the request
```

### Case and document path

```text
/app/cases or /app/documents
  → page and feature form
  → useCases()/useDocuments()
  → CaseRepository / DocumentRepository
  → Firestore owner-filtered records and/or Storage object
  → runtime parser validates documents returned to the application
```

### Appointment path

```text
/app/appointments
  → ScheduleAppointment
  → useAppointments()
  → AppointmentRepository
  → owner-scoped Firestore appointment record
```

The current layer separation is practical rather than absolute: hooks for ordinary records use concrete repositories, and the auth context performs direct profile reads/writes. Keep this limitation in mind when describing the architecture or extending it.

## 7. Operational and Development Notes

### Configuration and secrets

The browser Firebase configuration keys are listed in `.env.example` and read in `src/lib/firebase.ts`. Keep local values in a local environment file and do not commit credentials. Firebase Admin credentials for `scripts/manage-intake-reviewer.ts` are privileged and must never be exposed through browser variables or source control.

### Data validation and errors

`src/domain/models/validation.ts` parses untrusted Firestore records. Repositories report operation-specific `RepositoryError`s. Subscriptions report errors through callbacks; promise-based operations reject. Pages/hooks are responsible for user-visible handling of asynchronous failures. `src/components/ErrorBoundary.tsx` catches React rendering errors, not network failures or rejected event-handler promises.

### Validation commands

Run the applicable project scripts from the repository root:

```text
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

The CI workflow runs dependency installation, lint, tests, and build. There are Vitest service/repository tests, but no configured UI end-to-end suite or Firebase rules emulator test suite was found. Do not claim those verification layers have passed unless they are separately added and actually run.

## 8. Summary for Developers and Academic Reviewers

The implemented LegalFlow/JusTimCase application delivers public intake submission, claim-gated intake review and conversion to an owned client, attorney-owned client/case/appointment/document management, and Firebase-backed identity and access controls. Its actual architecture is React + TypeScript + Vite on the client, with Firebase Authentication, Firestore, and Storage as managed backend services.

The Express/PostgreSQL/Prisma architecture, SQL relationship tables, distinct Lawyer/Assistant RBAC, hearing/task reminders, case notes, automated PDF document engine, SMTP notifications, and expense ledger are not evidenced in the current repository. They may be valid capstone requirements or future enhancements, but should be labeled as such until corresponding implementation and verification exist.
