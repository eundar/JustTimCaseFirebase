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

  // Assign each client an owner by index, then derive every other collection's
  // ownerId from its own clientId (not its array index) so ownership always
  // matches the client the record actually belongs to — regardless of how
  // each collection's array is sized relative to mockClients.
  const ownerByClientId = new Map<string, string>(
    mockClients.map((client, i) => [client.id, ownerFor(i)])
  )
  const ownerForClient = (clientId: string) => {
    const ownerId = ownerByClientId.get(clientId)
    if (!ownerId) {
      throw new Error(`No owner found for clientId ${clientId}`)
    }
    return ownerId
  }

  const batch = db.batch()

  mockClients.forEach((client) => {
    const { id, ...data } = client
    batch.set(db.collection("clients").doc(id), {
      ...data,
      ownerId: ownerForClient(id),
    })
  })

  mockCases.forEach((c) => {
    const { id, ...data } = c
    batch.set(db.collection("cases").doc(id), {
      ...data,
      ownerId: ownerForClient(c.clientId),
    })
  })

  mockAppointments.forEach((a) => {
    const { id, ...data } = a
    batch.set(db.collection("appointments").doc(id), {
      ...data,
      ownerId: ownerForClient(a.clientId),
    })
  })

  mockDocuments.forEach((d) => {
    const { id, ...data } = d
    batch.set(db.collection("documents").doc(id), {
      ...data,
      storagePath: "",
      ownerId: ownerForClient(d.clientId),
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
