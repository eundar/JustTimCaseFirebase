export type CaseType =
  | "Criminal"
  | "Civil"
  | "Family"
  | "Corporate"
  | "Labor"
  | "Property"
  | "Immigration"
  | "Intellectual Property"
  | "Other"

export type DocumentType =
  "Contract" | "Brief" | "Invoice" | "Agreement" | "Other"

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
  clientName: string
  opposingParty?: string
  type: CaseType
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
  type: DocumentType
  uploadedDate: string
  size: string
  url: string
  storagePath: string
}

export interface CaseNote {
  id: string
  ownerId: string
  caseId: string
  body: string
  authorName: string
  createdAt: string
  updatedAt?: string
  // Appointments and documents of the same case that this note is about.
  appointmentIds: string[]
  documentIds: string[]
}

export interface ProspectiveClient {
  id: string
  fullName: string
  email: string
  phone: string
  caseType: CaseType
  caseDescription: string
  opposingParty?: string
  privacyAgreementAccepted: boolean
  status: "Pending Review" | "Accepted" | "Declined"
  createdAt: string
}

export interface ConflictMatch {
  matchedName: string
  source: "Existing Client" | "Other Intake"
  description: string
}

export interface ConflictCheckResult {
  hasPotentialConflict: boolean
  matches: ConflictMatch[]
}
