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
