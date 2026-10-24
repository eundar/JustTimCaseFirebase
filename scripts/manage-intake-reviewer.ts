import { applicationDefault, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const [uid, action] = process.argv.slice(2)

if (!uid || (action !== "grant" && action !== "revoke")) {
  console.error(
    "Usage: npm run intake-reviewer -- <firebase-uid> <grant|revoke>"
  )
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })

async function main() {
  const auth = getAuth()
  const user = await auth.getUser(uid)
  const claims = { ...user.customClaims }

  if (action === "grant") {
    claims.intakeReviewer = true
  } else {
    delete claims.intakeReviewer
  }

  await auth.setCustomUserClaims(uid, claims)
  if (action === "revoke") {
    await auth.revokeRefreshTokens(uid)
  }
  console.log(
    `Intake reviewer access ${action === "grant" ? "granted" : "revoked"} for ${uid}.`
  )
  console.log(
    "The user must sign out and sign in again for the claim change to take effect."
  )
  if (action === "revoke") {
    console.log("Previously issued ID tokens may remain valid until they expire.")
  }
}

main().catch((error: unknown) => {
  console.error("Failed to update reviewer claim:", error)
  process.exitCode = 1
})
