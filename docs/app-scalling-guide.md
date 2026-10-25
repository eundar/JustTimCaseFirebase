# Application Scaling and Architecture Guide

## 1. Purpose and How to Use This Guide

This guide is a working map for the JusTimCase application: where behavior lives, how changes move through the code, and how to validate a change without replacing the architecture that is already here. It is based on the repository as it exists in the current workspace; it is not a claim about what has been deployed.

Start with [Repository Structure](#3-repository-structure-and-important-files) to find a feature, then use [How to Trace a Feature](#5-how-to-trace-a-feature) to follow its calls. Use the feature and refactoring workflows before editing. Keep this guide, source code, and the Firebase rules aligned as the project changes.

The root [report.md](./report.md) is a dated architecture and security status snapshot. It records prior verification and known risks; re-run checks before relying on those results. The root [README.md](./README.md) is currently empty. The workspace contains substantial uncommitted changes, including the repository/service architecture described here. Treat the checked-out implementation as current for development, but do not assume all of it is committed or deployed.

**Evidence convention:** descriptions of current files and behavior below are verified from the workspace. A section labeled **Recommendation** or **Example change** describes a safe approach, not functionality that is already implemented. Where no code or test establishes a behavior, the limitation is stated rather than inferred.

## 2. Application Overview and Technology Stack

JusTimCase is a browser-based law-firm case-management application built with:

- React 19 and TypeScript, bundled by Vite.
- React Router for browser routes and lazy-loaded pages.
- Firebase Authentication, Cloud Firestore, and Cloud Storage.
- Tailwind CSS 4 and shared React UI components.
- Vitest for unit-style service and repository tests; ESLint and TypeScript for static checks.

Firebase configuration is read from `VITE_FIREBASE_*` variables in `src/lib/firebase.ts`. The expected names are listed in `.env.example`. The browser bundle must only receive the Firebase web configuration; never put Firebase Admin credentials in a `VITE_` variable or browser code.

The application has domain model and parsing modules, Firebase repositories, React hooks and pages, and an application service for intake workflows. It is **Clean Architecture-inspired, not fully dependency-inverted**:

- Repository classes in `src/data/repositories/` are the main Firestore boundary.
- `IntakeService` contains application workflow logic and accepts repository-shaped dependencies for tests, but its default dependencies are concrete repository singletons.
- Some hooks call repositories directly for ordinary owned-record CRUD.
- `AuthContext` reads and writes the attorney profile directly through Firestore.
- No dependency-injection container, formal domain repository interfaces, or separate use-case module is present.

Do not describe or build on abstractions that do not exist. Extend these established patterns unless a separately scoped architecture change is approved.

## 3. Repository Structure and Important Files

| Path | Responsibility and why it matters |
|---|---|
| `src/main.tsx` | Browser entry point; mounts React providers, `ErrorBoundary`, `Suspense`, and `RouterProvider`. |
| `src/router.tsx` | Route table; pages are lazy-loaded. Add page routes here, not inside an unrelated page. |
| `src/App.tsx` | Authenticated `/app` layout and UI redirect to `/login`; contains sidebar/header/outlet. |
| `src/pages/` | Route-level UI and page workflows (`Clients.tsx`, `IntakeForm.tsx`, `ClientIntakeForm.tsx`, etc.). |
| `src/components/layout/` | Shared application shell, header, and sidebar. |
| `src/components/dashboard/` | Reusable dashboard and feature components, including add/edit dialogs and profiles. |
| `src/components/ui/` | Shared UI primitives. Changes here can affect multiple pages. |
| `src/components/ErrorBoundary.tsx` | Catches React render errors and provides a reload fallback; it does not replace async error handling. |
| `src/context/AuthContext.tsx` | Auth state, sign-in/up/out operations, and loading of the attorney profile. |
| `src/domain/models/index.ts` | Shared domain record and union types such as `Client`, `Case`, `ProspectiveClient`, and `ConflictCheckResult`. |
| `src/domain/models/validation.ts` | Runtime parsers for untrusted Firestore values. Keep persisted-data validation synchronized with model/schema changes. |
| `src/application/services/IntakeService.ts` | Intake application workflows, including conflict checking and delegating accept/decline/submit operations. |
| `src/data/repositories/OwnedFirestoreRepository.ts` | Shared owner-scoped CRUD and subscription behavior for records with `id` and `ownerId`. |
| `src/data/repositories/` | Firestore implementations for clients, cases, appointments, documents, and prospective clients; operation errors and repository tests also live here. |
| `src/hooks/` | React state/subscription adapters around auth and repository/service behavior (`useClients`, `useCases`, `useClientIntakeForm`, etc.). |
| `src/lib/derived.ts` | Pure derived relationships and dashboard statistics from in-memory domain records. |
| `src/lib/utils.ts` | Shared UI/general utilities. |
| `src/types/models.ts`, `src/types/types.ts` | Compatibility re-exports from `src/domain/models`; avoid introducing new model definitions here. |
| `src/lib/firebase.ts` | Initializes and exports the Firebase SDK singletons: `auth`, `db`, `storage`. |
| `firestore.rules`, `storage.rules` | Server-enforced data access rules; these are essential security boundaries, not merely client-side validation. |
| `scripts/manage-intake-reviewer.ts` | Trusted Firebase Admin SDK utility for setting or removing the `intakeReviewer` custom claim. |
| `scripts/seed.ts` | Seed script, invoked with the `seed` package script. |
| `src/**/*.test.ts` | Current Vitest service/repository tests. |
| `.github/workflows/ci.yml` | GitHub Actions CI workflow: installs with `npm ci`, then lints, tests, and builds. |
| `package.json`, `package-lock.json` | Dependency manifest, exact lockfile, and supported npm scripts. |
| `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` | Vite aliases/build splitting, TypeScript checks, and lint conventions. |
| `.env.example` | Names of required Firebase web configuration variables; it contains blank placeholders, not usable credentials. |
| `firebase.json` | Maps Firebase Firestore and Storage emulators/deployments to the rules files; no emulator configuration or test script is present. |

Within `src/data/repositories/`, `ClientRepository`, `CaseRepository`, `AppointmentRepository`, and `DocumentRepository` extend `OwnedFirestoreRepository`. `ProspectiveClientRepository` is separate because public intake creation and reviewer-only reads/status transitions have different behavior.

## 4. Current Architecture and Dependency Flow

### Layer responsibilities

1. **Domain — `src/domain/models/`:** TypeScript shapes and runtime parsers for persisted records. These types are used throughout the UI and data code. This is not a rich domain layer with entity methods or domain services.
2. **Data — `src/data/repositories/`:** Firestore queries and mutations, ownership checks, record parsing, and conversion of failures to `RepositoryError`. The repository base class shares the common owner-filtered behavior.
3. **Application — `src/application/services/`:** Multi-step/application workflows. `IntakeService.checkConflict()` combines an intake, the signed-in attorney's clients, and the intake queue to produce a `ConflictCheckResult`.
4. **Presentation — `src/pages/`, `src/components/`, `src/hooks/`, `src/context/`:** Routes, interaction/state, UI, authentication context, loading/error display, and calls into hooks/services/repositories.
5. **Infrastructure/configuration — `src/lib/firebase.ts`, root Firebase rules, Vite and environment configuration:** SDK setup, backend access policy, build and runtime configuration.

### Dependency flow and known exceptions

The common path is **page/component → hook → repository → Firebase SDK**. For the intake workflow it is **page → `useProspectiveClients` → `IntakeService` → repository/repositories → Firebase**. Domain types/parsers are shared by both data and presentation code.

The intended boundary is that pages should not build Firestore queries or parse raw Firestore records themselves. Put query/mutation mechanics in repositories, domain shape validation in parsers, and multi-repository workflow rules in a service where an existing service already owns that behavior.

There are verified exceptions to a strict textbook dependency direction: repositories import `auth` and `db` from `src/lib/firebase.ts`; `AuthContext` directly calls Firestore for attorney profiles; regular data hooks import concrete repositories; `IntakeService` defaults to singleton repositories. There are no formal repository interfaces or central DI registration. Tests replace Firebase SDK functions with Vitest mocks and inject service dependencies where available.

### Initialization, routing, auth, and error handling

- `src/main.tsx` initializes the React tree as `StrictMode > ErrorBoundary > ThemeProvider > AuthProvider > Suspense > RouterProvider`.
- `src/router.tsx` defines public `/`, `/client-intake-form`, and `/login` routes and the authenticated `/app` layout with children for dashboard, clients, cases, documents, appointments, intake forms, and settings.
- The `App` component reads `useAuth()`, waits for its loading state, and redirects to `/login` when there is no user. This is a UI navigation guard only. Firestore/Storage rules must enforce data access independently.
- `AuthProvider` listens to `onAuthStateChanged`; when signed in it loads `attorneys/{uid}` and parses the profile. A profile-load failure is logged and sets `attorneyProfile` to `null` while the Firebase user remains set; an auth-listener error logs and clears both. Sign-up, sign-in, and sign-out promises are exposed to consumers.
- `ErrorBoundary` handles render failures. Repository subscriptions report errors through callbacks, repository promises throw `RepositoryError`, and pages/hooks are responsible for presenting or handling asynchronous failures. The boundary does not catch event-handler or rejected-promise errors.

### Data access and security

- `OwnedFirestoreRepository` filters reads/subscriptions with `where("ownerId", "==", ownerId)` and checks the current Firebase UID before operations. Its create adds `ownerId`; updates accept partial record fields excluding `id` and `ownerId`.
- `firestore.rules` independently scopes attorney-owned `clients`, `cases`, `appointments`, and `documents` by `ownerId`; Storage document paths are restricted to the matching authenticated UID in `storage.rules`.
- Public prospective-client creation is schema-limited in `firestore.rules`. Intake review reads and status updates require both an attorney profile and `request.auth.token.intakeReviewer == true`. The reviewer helper in `ProspectiveClientRepository` checks the token as an additional client-side gate, not a substitute for rules.
- The intake queue is firm-wide, not assigned per attorney. The Admin SDK script changes the trusted claim. See `docs/security/intake-reviewer-approval.md` for the operator procedure and token-refresh caveats.
- Parsers reject malformed records. A bad record in a collection snapshot may cause the current subscription/list parsing operation to report an error instead of returning partial results.

**Verification limit:** `firebase.json` points to rules files, but no Firebase Emulator Suite configuration or rules test is present. `report.md` records that rules have not been verified in an emulator or deployed. Passing frontend tests/build does not prove production Firebase authorization.

## 5. How to Trace a Feature

Use a known interaction rather than searching filenames by guesswork:

1. **Find the entry point.** Search `src/router.tsx` for the path, then open the page under `src/pages/`. For example, `/app/intakeforms` loads `src/pages/IntakeForm.tsx`; public `/client-intake-form` loads `src/pages/ClientIntakeForm.tsx`.
2. **Identify the UI action/state owner.** Follow component imports and handlers. `IntakeForm` calls `acceptProspectiveClient`, `rejectProspectiveClient`, and `checkConflictOfInterest` from `useProspectiveClients`.
3. **Follow the hook import.** `src/hooks/useClientIntakeForm.ts` exposes those actions, subscribes to intake records, and delegates conflict/accept/decline to `intakeService`.
4. **Follow workflow logic.** `src/application/services/IntakeService.ts` defines conflict matching and delegates the other intake operations.
5. **Follow persistence and parsing.** Open `src/data/repositories/ProspectiveClientRepository.ts` for intake reads/writes and `src/data/repositories/ClientRepository.ts` / `OwnedFirestoreRepository.ts` for owned client lookup. Check `src/domain/models/validation.ts` for persisted record expectations.
6. **Check the enforcement boundary.** Trace each collection operation to `firestore.rules`; for uploaded files also inspect the `storagePath` use and `storage.rules`.
7. **Find tests and consumers.** Search the relevant symbol (for example `checkConflict` or `createPublic`) across `src/`. Inspect its `.test.ts` file and every consumer before changing a shared contract.

For ordinary clients, start at `/app/clients` → `src/pages/Clients.tsx` → `useClients()` in `src/hooks/useClients.ts` → `clientRepository` → `ClientRepository` → `OwnedFirestoreRepository`. The page also uses `useCases()` and the pure `getAllClientsWithCaseCounts()` helper, so changes to client/case fields can affect derived UI even if the repository itself is untouched.

To decide whether to extend an existing implementation, search for the domain type, public method, route, and related component before creating a new one. Compare a sibling feature (for example `CaseRepository` against `ClientRepository`) and reuse `OwnedFirestoreRepository` when the data has the same owner-scoped CRUD behavior. Do not reuse it for intake flows just to force uniformity; intake intentionally has distinct public and reviewer access modes.

## 6. How to Add a New Feature

Adapt this sequence to the feature; not every task needs every layer.

1. **Write down the behavior and access rules.** Define actors, inputs, outputs, error/loading states, and who may read or change each record. For data changes, identify the Firestore/Storage collection and rule before implementation.
2. **Find the closest existing feature.** Compare UI and behavior in `src/pages/` and `src/components/`; inspect its hook, repository, parser, and test. For owner-scoped records, use `ClientRepository` and `OwnedFirestoreRepository` as the working pattern. For intake, use `IntakeService`.
3. **Map the affected paths.** Trace route → page → hook/service → repository → model/parser → Firebase rules. Search for all consumers of any field/type/method to avoid updating only the first caller.
4. **Add/update the domain shape.** Put shared record types and unions in `src/domain/models/index.ts`, not in a page. If reading a persisted record, implement/update its parser in `src/domain/models/validation.ts`. Update `src/types/models.ts` only as needed for legacy imports; prefer direct `@/domain/models` imports for new code.
5. **Place business/workflow logic.** Use a pure helper for calculations on already-loaded values (`src/lib/derived.ts` is an example). Keep multi-repository orchestration in an application service when it is a workflow like intake conflict checking. Keep page state and interaction in the presentation layer.
6. **Add persistence behavior.** Add a typed repository in `src/data/repositories/`. Extend `OwnedFirestoreRepository<T>` for records that consistently require `ownerId`; implement a dedicated repository when permissions, transactions, or collection behavior differ. Convert SDK/raw-data failures with `toRepositoryError` and parse incoming records.
7. **Wire the UI.** Add or update a hook in `src/hooks/` to own subscriptions and connect authentication identity to the repository. Add the page/component. Register a route in `src/router.tsx` if it is a new page, and add navigation in the relevant layout/sidebar if it should be discoverable.
8. **Update security/configuration in the same change.** For stored fields or operations, change `firestore.rules` and/or `storage.rules` as required; client-side checks do not authorize access. Keep `.env.example` synchronized if a new browser configuration variable is truly required. Never expose Admin SDK secrets.
9. **Test the narrow logic and boundary.** Add pure/service tests for business behavior and repository tests for owner filtering, parsing, authorization preconditions, and error paths. Current Vitest examples are `src/application/services/IntakeService.test.ts` and `src/data/repositories/ClientRepository.test.ts`.
10. **Validate and review.** Run the relevant npm scripts in [Testing and Validation](#10-testing-and-validation). Review the diff for rule coverage, all consumers, error/loading states, unrelated formatting, and accidental credential/config changes.

**Avoid:** placing Firestore calls in JSX, duplicating models inside a page, trusting a UI redirect for authorization, adding an abstraction with no current use, or bypassing parsers by casting SDK data directly to a domain type.

## 7. How to Modify Existing Functionality

Before editing, identify whether the behavior is a display concern, business rule, persistence contract, authorization rule, or a combination. Search for the current symbol and its call sites; record the affected model fields and test files.

- **Business rules:** Change the owning service or pure helper, not multiple pages independently. For example, the case-insensitive, trimmed party matching is in `IntakeService.checkConflict()`. Update its tests for both matches and non-matches.
- **UI behavior:** Change the page/component and its hook contract as appropriate. Keep data acquisition and mutation out of the visual component when the hook/repository already owns that behavior.
- **Stored data shape:** Update `src/domain/models/index.ts`, the corresponding parser, repository write/read logic, UI forms, and Firestore rules together. Assess old persisted records: a newly required parser field can make older records fail to load.
- **Authorization:** Update both the client-side flow and Firebase rules. Verify allowed and denied cases; never weaken rules just to make a UI test pass.
- **Shared components/interfaces:** Find every import and consumer first. Keep existing signatures compatible where possible; if a contract must change, update all callers and tests in one coherent change.
- **Errors:** Keep async failures visible to the user or hook callback and preserve useful operation context in `RepositoryError`. A render boundary does not handle network promises.
- **Derived data:** If changing client/case/appointment/document relations, inspect `src/lib/derived.ts` and its page consumers as well as persistence code.

Prefer the smallest coherent patch. Do not bundle broad cleanup, renaming, or a new architecture into a targeted behavior change. If legacy data requires a staged migration, document the compatibility period and rollout sequence; no general Firestore migration framework is present in the repository.

## 8. How to Upgrade Dependencies and Refactor Safely

The project uses npm with `package.json` and `package-lock.json`. CI uses Node.js 22 and `npm ci`; match that runtime when reproducing CI locally.

1. Identify the package, why it is needed, whether it belongs in `dependencies` or `devDependencies`, and the consumers/API surface it affects.
2. Review the package's peer/runtime compatibility with the versions recorded in `package.json`; avoid forced major upgrades as a shortcut.
3. Make the manifest and lockfile changes together using npm, then inspect both diffs. Do not hand-edit lockfile resolution data.
4. Run `npm run lint`, `npm test`, and `npm run build`; run `npm run typecheck` when a focused TypeScript check is useful. `npm run build` also executes `tsc -b`.
5. Check Vite output or runtime behavior if a dependency affects bundling, browser compatibility, or chunking. `vite.config.ts` currently groups React, Firebase modules, UI packages, and general vendor code.
6. Read the final diff for package scripts, lockfile churn, accidental config changes, and API behavior changes.

The `format` script runs `prettier --write "**/*.{ts,tsx}"` across the repository; it is not a check-only command and can touch many source files. Use it only when broad formatting is intended, then inspect the diff. There is no configured Markdown format/check script or formatter step in CI.

When refactoring, preserve consumer-facing repository and hook methods where possible. Replace an implementation behind its existing seam rather than changing every page to depend on a new concrete SDK detail. Keep refactors behavior-preserving and separate from unrelated product work. The current Firebase singleton imports and direct repository hook usage are real coupling points; do not silently claim they are abstracted away.

## 9. Architecture Rules and Common Violations

| Rule | Reason and applies to | Compliant pattern | Common violation | How to verify |
|---|---|---|---|---|
| Keep raw Firestore operations in data access code. | Prevent pages from depending on persistence details; applies to `src/pages/`, `src/components/`, and `src/hooks/`. | Call `useClients()` and let `ClientRepository` / `OwnedFirestoreRepository` query Firestore. | Build `collection()`/`query()` calls in `Clients.tsx`. | Search feature files for `firebase/firestore`, `getDocs`, `onSnapshot`, and compare existing usage; new usages should normally be in repositories or the established auth context. |
| Validate persisted data at runtime. | Firestore values are not made safe by TypeScript types; applies to repository reads and `src/domain/models/validation.ts`. | Use `parseClient(id, data)` as `ClientRepository` does. | `data() as Client` and accept unknown fields/types. | Add malformed-record tests and confirm repositories call the parser for snapshots and lists. |
| Scope attorney-owned reads and writes to the signed-in owner. | Avoid cross-attorney data access; applies to repositories and Firestore rules for owned collections. | Pass the current UID into `clientRepository` and filter `ownerId`; rules independently check ownership. | Query all records and filter in the browser, or trust a supplied owner ID alone. | Verify repository tests and inspect corresponding match blocks in `firestore.rules`; test both authorized and mismatched owner cases. |
| Treat Firebase rules as authoritative. | A browser can be modified; UI guards and client prechecks are not security controls. | Maintain the `intakeReviewer` rule and repository token check for distinct roles; test rules in an emulator before deployment when that setup is added. | Grant access based only on `attorneyProfile`, hide a button, or assume the route redirect protects data. | Inspect `firestore.rules`/`storage.rules`; current automated rules testing is absent, so do not mark backend authorization verified based on Vitest alone. |
| Put cross-repository workflow rules in a single application owner. | Avoid duplicated business behavior across page handlers. | `IntakeService.checkConflict()` owns conflict matching; the page triggers and displays the result. | Reimplement party matching in `IntakeForm` and a second component. | Search for duplicate rules; exercise behavior with the service test. |
| Reuse the owner-scoped repository base only where the data model fits. | Shares query, CRUD, and parser handling without hiding special access requirements. | `ClientRepository` extends `OwnedFirestoreRepository<Client>`. | Force the public/reviewer intake workflow into this base despite different permissions and transactions. | Compare collection permissions and operations before inheriting; add repository tests for special behavior. |
| Keep async errors explicit and operation-specific. | Prevent silent failure and misleading success states. | Repositories throw/report `RepositoryError`; pages/hooks handle async errors. | Swallow a catch or return empty data after a failed read. | Test rejection and callback paths; check visible UI feedback. |
| Keep the domain model shared and presentation types local only when truly UI-specific. | Avoid incompatible copies of persisted data contracts. | Add `ProspectiveClient` fields in `src/domain/models/index.ts` and parser/rule updates as required. | Redefine a Firestore record interface inside a page. | Search type declarations and imports; verify persisted record parser tests. |
| Keep framework dependencies out of data-independent calculations. | Pure logic is easier to reason about and test. | `getStatistics()` and relationship helpers in `src/lib/derived.ts` accept typed arrays. | Import React/Firebase into a pure calculation or place reusable domain decisions in JSX. | Inspect imports and unit-test deterministic input/output. |
| Avoid circular dependencies and needless layers. | The current application is intentionally small and does not have a container or domain-interface framework. | Follow existing import direction: presentation uses hooks/services, repositories use domain parsers/types. | Add a generic DI framework or have domain import a page/repository. | Inspect new imports for reverse-layer edges and cycles; use existing test seams. |
| Preserve existing route/layout responsibilities. | Authenticated child routes rely on the `/app` layout and `Outlet`. | Register a child route in `src/router.tsx`; use `App` for authenticated shell. | Duplicate shell/auth checks inside each page without need. | Verify route URL, layout and loading/redirect behavior. |

**Current inconsistency to understand:** service-level abstraction is present for intake only. Other hooks intentionally import concrete repository singletons, and `AuthContext` is directly integrated with Firebase. This is established code, not proof of complete dependency inversion. Keep new work consistent with the nearest existing feature unless a focused design decision changes these boundaries.

## 10. Testing and Validation

### Current test coverage and conventions

- Vitest tests are co-located with the service/repository under `src/application/services/` and `src/data/repositories/`.
- `IntakeService.test.ts` injects mock dependencies into `new IntakeService(...)` and tests normalized party matching and delegation.
- `ClientRepository.test.ts` uses `vi.hoisted()` and `vi.mock()` for Firebase SDK and `@/lib/firebase`; it checks owner-filtered subscriptions, create/update/delete behavior, owner mismatch, parsing errors, and unsubscribe.
- `ProspectiveClientRepository.test.ts` mocks Firebase and checks reviewer-claim denial and successful loading when the claim is present.
- There are no component, browser end-to-end, Firebase Emulator rules, or Storage rules tests configured in the repository. No architecture-boundary checker is configured.
- `report.md` records a prior run with three test files and eight tests. That is historical evidence only; run the current workspace checks before reporting success.

### Commands

| Command | What it verifies |
|---|---|
| `npm ci` | Installs exactly from `package-lock.json`, as CI does. |
| `npm test` | Runs `vitest run`. |
| `npm run lint` | Runs ESLint across the project. |
| `npm run typecheck` | Runs `tsc -b`. |
| `npm run build` | Runs `tsc -b` and the Vite production build. |
| `npm run format` | Rewrites all `*.ts` and `*.tsx` files via Prettier; use carefully because it is broad. |

The CI workflow at `.github/workflows/ci.yml` runs Node.js 22, `npm ci`, lint, tests, and build for pushes and pull requests.

### Choosing tests

- Business rule or derived value change: add a service/pure-helper test for normal, edge, and negative cases.
- Repository change: test query filters, parser use, owner/reviewer preconditions, errors, and mutations with the existing Firebase mocks.
- UI change: currently no component test harness is configured; still run lint/typecheck/build, manually verify the route and loading/error/success interaction, and avoid claiming automated UI coverage.
- Rule/access change: test allowed and denied reads/writes against Firebase Emulator Suite before deploying. The project currently lacks emulator test setup, so this remains a verification gap rather than an npm command.

When a test fails, identify whether the failure is in the behavior, fixture, mock contract, or persisted schema. Do not weaken a check merely to restore green output. Update the test and parser/rules together if the contract intentionally changed.

## 11. Step-by-Step Real-World Walkthroughs

### Example A — Extend conflict checks to consider existing case opposing parties

This is a **proposed extension**, not behavior currently implemented. The existing `Case` model already has optional `opposingParty`; current intake conflict matching checks owned client names and parties from other intakes.

1. Trace `/app/intakeforms`: `src/router.tsx` → `src/pages/IntakeForm.tsx` → `useProspectiveClients()` in `src/hooks/useClientIntakeForm.ts` → `intakeService.checkConflict()` in `src/application/services/IntakeService.ts`.
2. Confirm data availability and permissions. `CaseRepository` extends `OwnedFirestoreRepository<Case>`, which provides `list(ownerId)`; the owner filter and Firestore rule are already part of the case path.
3. Extend `IntakeService`'s injected dependencies with a `cases.list` contract and default it to the existing case repository. Keep normalized party matching in `checkConflict()`, not in the page. Preserve dependency injection so the service test does not need Firebase.
4. Include owned cases' optional `opposingParty` names in the matching logic and make each `ConflictMatch` description/source clear enough for the existing UI to explain. Decide explicitly whether case titles/client names are in scope; do not imply they are checked unless implemented.
5. Update `IntakeService.test.ts` with a case-opposing-party match, case-insensitive/whitespace behavior, and a no-match result. Update mocks to satisfy the new service dependency contract.
6. Verify `CaseRepository` listing is owner-scoped and run `npm test`, `npm run lint`, and `npm run build`. Manually run the intake conflict flow and check its modal/result rendering.

This reuses the current case repository and preserves the presentation/service boundary. It does not require a new Firestore query or a new general-purpose conflict framework.

### Example B — Change the shared intake queue to attorney-assigned intakes

This is a **cross-layer proposal**, not an existing capability. The current queue is firm-wide; `report.md` identifies per-attorney assignment as a possible confidentiality requirement. First confirm the actual product/security requirement with the owner before implementing it.

1. Map every current touchpoint: `ProspectiveClient` and its parser in `src/domain/models/`; public create and review operations in `ProspectiveClientRepository`; reviewer UI in `IntakeForm.tsx`; `useProspectiveClients`; and `firestore.rules`.
2. Choose a trusted assignment source. Do not let an anonymous browser choose the attorney who receives or can read an intake. The current public form is `ClientIntakeForm.tsx`, and the public create rule is schema allowlisted.
3. Define the assignment lifecycle and handling for existing unassigned records. If the requirement implies server-side routing or privileged assignment, identify the trusted backend/Admin operation before changing the public client.
4. Update the domain shape and `parseProspectiveClient()` for the chosen persisted representation. Consider legacy records: making assignment mandatory without migration can reject existing records.
5. Change repository queries/subscriptions and all transitions so they only return/update records assigned to the authorized UID. Keep custom-claim checks if they remain part of the product policy; assignment does not automatically replace role authorization.
6. Update Firestore create/read/update rules as the authoritative enforcement. Confirm that an authorized reviewer cannot change another attorney's assignment or read unassigned/other-assignee records. Update Storage rules too only if intake files are added; they currently protect `/documents/{ownerId}/...`.
7. Update hook state, empty/error states, UI copy and tests. Add repository tests for assignment filters and service tests for workflow decisions. Plan actual rules-emulator coverage; current tests mock Firestore and cannot prove rule behavior.
8. Run lint, tests, typecheck/build and the required emulator authorization matrix. Review the deployment order for rules, trusted assignment mechanism, migration/backfill, and frontend rollout; no such migration pipeline currently exists.

This example shows why privacy changes cannot be implemented only by filtering a list in React. Repository queries, record shape, trusted assignment, rules, legacy records, and tests must agree.

## 12. Recommended Development Workflow

1. Translate the task into observable behavior, affected users, access constraints, and failure cases.
2. Locate the route or interaction in `src/router.tsx` and `src/pages/`.
3. Trace calls through hooks/services/repositories to models, parsers, Firebase configuration, and rules.
4. Search all consumers of changed symbols and inspect nearby tests.
5. Choose the smallest owner of the behavior; decide if the change is UI-only, application logic, persistence, security, or cross-layer.
6. Make a short file-by-file plan and identify compatibility risks for existing Firestore records.
7. Implement with existing names, type shapes, error handling, and repository patterns; keep UI and raw data access separated.
8. Add/update tests and directly related documentation or rules in the same change.
9. Run focused tests first, then the project lint/typecheck/build commands appropriate to the change.
10. Inspect `git diff` and `git status`; confirm no unrelated files, broad formatter edits, secrets, or accidental lockfile/config changes.
11. Manually verify relevant browser routes and async states. For Firebase authorization changes, separately verify rules using an emulator; do not infer that frontend checks are enough.
12. Summarize what changed, exact checks actually run, and any remaining rule/deployment/migration risk.

### Pre-merge / pre-commit checklist

- [ ] Requirement and intended access rules are covered.
- [ ] All consumers of changed models, hooks, and repository methods were considered.
- [ ] Runtime parsers, Firestore/Storage rules, and old-record compatibility were considered where applicable.
- [ ] Tests cover important success, failure, and authorization paths.
- [ ] `npm run lint`, `npm test`, and `npm run build` (or a justified focused subset) were run and results are reported accurately.
- [ ] UI behavior and errors were manually checked when automated coverage does not exist.
- [ ] Firebase rules/emulator status is explicitly recorded for security-sensitive changes.
- [ ] `git diff --check` is clean; diff contains only intended changes and no credentials.
- [ ] Related documentation is updated; no unrelated refactor or broad formatting noise is included.

The repository provides CI for pushes and pull requests but does not establish a particular branching or release strategy in its configuration.

## 13. GitHub Copilot Prompt Examples

Use this file as a guide, not as a substitute for reading current implementation. Ask Copilot to inspect relevant code, state its findings and plan before editing when scope is unclear, and avoid unrelated modifications. If this guide conflicts with the current source, inspect both and resolve the discrepancy rather than blindly following either one.

**Find the right files**

> Read `app-scalling-guide.md`, then inspect the current implementation of [feature]. Trace the route, page, hook/service, repository, model/parser, rules, and tests. List the exact files and symbols involved and explain the call flow. Do not edit files yet; distinguish verified behavior from assumptions.

**Plan a feature**

> Using `app-scalling-guide.md` as a reference, inspect the existing feature closest to [requested behavior]. Propose the smallest file-by-file implementation plan, including data authorization, parser/schema compatibility, tests, and commands to run. Do not invent missing abstractions or modify unrelated code.

**Implement a feature**

> Implement [behavior] after inspecting the relevant source. Follow the current patterns documented in `app-scalling-guide.md`, update all affected consumers and tests, and preserve existing route and Firebase security boundaries. Before editing, summarize the files and intended changes; then make only the necessary changes and report validation actually completed.

**Refactor safely**

> Refactor [specific behavior] without changing externally visible behavior. Inspect all callers and tests first. Preserve current repository/hook contracts where possible, avoid broad formatting and unrelated cleanup, and explain how the change maintains the boundaries in `app-scalling-guide.md`.

**Review for architecture issues**

> Review this diff against `app-scalling-guide.md` and the current source. Look for misplaced Firestore access, unvalidated persisted data, missing owner/reviewer enforcement, duplicated business rules, unhandled async failures, stale consumers/tests, and unrelated edits. Report only evidence-backed issues with file and line references; do not edit.

**Choose validation**

> For the changes in this diff, identify the smallest relevant tests and repository-supported validation commands from `package.json` and `.github/workflows/ci.yml`. Distinguish checks that exist from manual checks or Firebase Emulator coverage that is not configured.

## 14. Troubleshooting and Common Mistakes

- **A record unexpectedly fails to load:** inspect the corresponding parser in `src/domain/models/validation.ts` and persisted Firestore fields. Parsers reject malformed documents; do not bypass the error with a cast.
- **An owned collection is empty or permission-denied:** compare current auth UID, the repository's `ownerId` filter, document `ownerId`, and `firestore.rules`. Client-side filtering cannot correct server authorization.
- **Intake review is denied:** verify the account has an attorney profile and the trusted `intakeReviewer` custom claim. After changing the claim, sign out/in to refresh the ID token. Read `docs/security/intake-reviewer-approval.md`; never grant the claim by editing a profile field.
- **A status update fails:** inspect the transaction and status transition in `ProspectiveClientRepository` as well as the rule requiring `Pending Review` → `Accepted` or `Declined` with no unrelated field changes.
- **A page does not load:** check the route path in `src/router.tsx`, lazy import path/export, and `Suspense`/`ErrorBoundary` behavior in `src/main.tsx`.
- **An async operation fails but the page still renders:** the render error boundary does not catch rejected promises. Trace repository errors to the hook/page's error state and visible feedback.
- **Tests fail after changing a dependency contract:** update all mocks and consumers; for `IntakeService`, injected dependencies must satisfy its repository-shaped contract.
- **A rules edit appears to work in the frontend:** the current Vitest mocks do not execute Firebase security rules. Emulator verification is still required.
- **Prettier produces a huge diff:** `npm run format` intentionally writes every TypeScript/TSX file. Inspect and undo only your own unintended changes carefully; do not discard pre-existing workspace edits.
- **Build succeeds but deployed behavior differs:** compare `.env` values and Firebase project/rules deployment state. `firebase.json` names rule files but does not prove they have been deployed.

## 15. Quick Reference and Final Checklists

### Fast path by change type

| Change | Start here | Remember |
|---|---|---|
| Page or route | `src/router.tsx`, `src/pages/`, `src/components/` | Update authenticated layout/navigation only if needed. |
| Owned record CRUD | `src/hooks/use*.ts`, `src/data/repositories/`, `OwnedFirestoreRepository.ts` | Preserve UID filtering, parser use, and matching rules. |
| Intake workflow | `src/pages/IntakeForm.tsx`, `useClientIntakeForm.ts`, `IntakeService.ts`, `ProspectiveClientRepository.ts` | Preserve reviewer authorization and transactional status rules. |
| Record field/schema | `src/domain/models/index.ts`, `validation.ts`, repository, UI form, `firestore.rules` | Consider existing persisted records and update tests. |
| Auth/profile | `src/context/AuthContext.tsx`, `src/lib/firebase.ts`, `firestore.rules` | UI auth state is not data authorization. |
| Uploaded files | `src/data/repositories/DocumentRepository.ts`, document UI, `storage.rules` | Confirm path owner and any needed file type/size policy; current rules only match UID to path. |
| Shared UI | `src/components/ui/` and all consumers | A primitive change can affect many routes. |
| Build/dependency | `package.json`, `package-lock.json`, `vite.config.ts`, CI workflow | Keep lockfile current and run checks under Node 22. |

### Final task checklist

- [ ] I can explain the current call path and why each changed file owns its part.
- [ ] I reused existing components, hooks, repositories, and service logic where appropriate.
- [ ] Domain shapes, runtime parsing, data access, UI, and authorization remain aligned.
- [ ] Tests and documentation reflect the changed behavior.
- [ ] I ran and reported only checks that actually completed.
- [ ] I reviewed the diff for security, compatibility, unrelated changes, and secrets.
- [ ] Any missing emulator, deployment, migration, or product-policy verification is clearly called out.
