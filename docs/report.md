# JusTimCase Architecture and Security Status

**Status date:** 2026-10-24  
**Scope:** Current workspace state for the React 19, TypeScript, and Firebase application.

## Executive summary

The project has been refactored from a flat prototype toward a Clean Architecture-inspired structure. Firebase access is routed through repositories, intake workflows are coordinated by an application service, persisted records are validated at runtime, routes are lazy-loaded, and CI runs lint, tests, and a production build.

Firestore access for attorney-owned records is scoped to the authenticated attorney. Intake review requires a trusted Firebase Authentication custom claim in addition to an attorney profile. The rules and workflow are implemented in the workspace but have not been verified with the Firebase Emulator Suite or deployed. Those remain production readiness gates.

## Current architecture

- **Domain:** `src/domain/models/` contains shared domain types and parsers for Firestore records.
- **Data:** `src/data/repositories/` contains Firebase repositories, shared owner-scoped access, and repository error handling.
- **Application:** `src/application/services/IntakeService.ts` orchestrates intake review and conflict checks outside of UI components.
- **Presentation:** React hooks use repositories/services; route components are lazy-loaded and rendered through `Suspense`.
- **Error handling:** A global React Error Boundary handles render-time failures. Repository operations expose operation-specific errors; UI flows handle asynchronous errors where used.
- **Compatibility:** `src/types/models.ts` and `src/types/types.ts` re-export domain types for remaining imports.

This is Clean Architecture-inspired rather than fully dependency-inverted: repositories still use the Firebase SDK singleton configuration.

## Security and data access

### Attorney-owned records

`clients`, `cases`, `appointments`, and `documents` use `ownerId` checks in Firestore rules. Creates must belong to the authenticated attorney; reads and deletes require ownership; updates must preserve the existing owner. Storage document paths are scoped to `/documents/{ownerId}/...` and require the authenticated UID to match that path owner.

The corresponding hooks delegate to repositories that query using the authenticated UID and an explicit owner filter. The Firestore rules remain the authoritative access control.

### Intake review authorization

Public intake submission remains enabled with field allowlists and basic field/type/length checks. Intake reads and status transitions are limited to users who have both an `attorneys/{uid}` profile and the trusted `intakeReviewer` Firebase Auth custom claim. Profile creation or editing does not grant the claim.

The trusted Admin SDK command is `npm run intake-reviewer -- <firebase-uid> <grant|revoke>`. It preserves other custom claims. Revocation also invalidates refresh tokens, but previously issued ID tokens may remain valid until expiry (typically up to one hour); see `docs/security/intake-reviewer-approval.md`.

**Scope limitation:** `intakeReviewer` grants access to the firm's shared prospective-client queue. It does not provide per-attorney assignment or isolation.

### Runtime record validation

Repository parsers validate clients, cases, appointments, documents, prospective clients, and attorney profiles before returning domain values. Invalid records fail parsing explicitly rather than being silently accepted. A malformed record can therefore cause an entire collection result to fail until the record is corrected.

## Build, quality, and CI

- ESLint exceptions are scoped to modules that intentionally export non-component helpers or hooks alongside UI components; `use-mobile` uses `useSyncExternalStore`.
- Vitest tests cover intake service behavior and repository operations, including owner filtering, parsing failures, and reviewer authorization.
- `.github/workflows/ci.yml` runs `npm ci`, lint, tests, and build on pushes and pull requests.
- Route-level lazy loading and Vite/Rolldown chunk grouping are configured. The most recent recorded production build's largest JavaScript chunk was approximately **446 kB** (Firestore vendor chunk).
- `shadcn` is in development dependencies rather than production dependencies.

## Verification status

The latest recorded validation completed successfully:

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npm test` | Passed — 3 test files, 8 tests |
| `npm run build` | Passed — TypeScript and Vite production build |
| `git diff --check` | Passed; Git reported line-ending conversion warnings for two TSX files |

These checks validate application code, not deployed Firebase rules. No Firestore/Storage Emulator, browser end-to-end, or production deployment verification is recorded.

## Remaining risks and recommended next steps

1. **Before deployment, test Firebase rules in the Emulator Suite.** Cover anonymous intake creation, unapproved/approved/revoked reviewers, permitted status transitions, cross-owner reads/writes/deletes, owner mutation, and cross-user Storage access.
2. **Review shared intake confidentiality.** If attorneys should not see all firm submissions, add assignment fields and enforce assignment in both repositories and Firestore rules.
3. **Harden public intake against abuse.** Schema validation is not rate limiting; add server-side throttling and/or CAPTCHA with a trusted intake endpoint.
4. **Add Storage constraints** for content type, file size, and permitted operations if required by the document-upload policy.
5. **Review dependency advisories.** The latest recorded `npm audit` after moving `shadcn` to dev dependencies reported 16 advisories (7 moderate, 9 high, 0 critical). Re-run the audit against the current lockfile and address advisories selectively; avoid forced upgrades without compatibility review.
6. **Consider isolating malformed legacy records.** Current parsing is intentionally explicit but can fail a complete list/snapshot when any record is invalid.
7. **Reconcile the workspace deletion** of `docs/sidebar-ui-guide.md` if it was not intended. It was present as a deletion in the recorded working tree and has not been restored as part of this report update.

## Current workspace note

This status reflects files present in the working tree, not a deployed environment or a clean committed revision. Firebase rules, custom-claim provisioning, and CI behavior should be confirmed in the target Firebase/GitHub projects before production rollout.