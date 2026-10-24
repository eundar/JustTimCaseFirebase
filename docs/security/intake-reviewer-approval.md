# Intake reviewer approval

Intake review access is controlled by the Firebase Authentication custom claim
`intakeReviewer`. Creating or editing an `attorneys/{uid}` profile does not grant
this claim. Firestore rules require the claim for prospective-client reads and
status updates, and the client repository checks it before starting review
operations.

Grant or revoke reviewer access only from a trusted administrative environment
with Firebase Admin SDK Application Default Credentials configured for the
correct Firebase project:

```powershell
npm run intake-reviewer -- <firebase-uid> grant
npm run intake-reviewer -- <firebase-uid> revoke
```

The command preserves other custom claims. After a claim change, the user must
sign out and sign in again before the client sees the refreshed claim. Do not
expose Admin SDK credentials to the browser or commit credentials to the
repository.

Revoking access also revokes refresh tokens. Previously issued ID tokens can
remain valid until expiry (typically up to one hour), so treat claim revocation
as taking effect after that token window unless an immediate incident-response
procedure is applied.

This currently grants access to the firm's shared intake queue. It does not
assign submissions to individual attorneys. Add explicit assignment and
corresponding Firestore authorization checks if intake records must be isolated
within a firm.
