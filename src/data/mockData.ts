// Single Source of Truth for all application data

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Attorney {
  id: string
  name: string
  specialization: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
}

export interface Case {
  id: string
  title: string
  clientId: string
  type: string
  status: "Active" | "Pending" | "Closed"
  openDate: string
}

export interface Appointment {
  id: string
  clientId: string
  caseId: string | null
  type: string
  date: string
  time: string
  status: "Scheduled" | "Confirmed" | "Completed" | "Pending"
  location: string
}

interface Document {
  id: string
  name: string
  caseId: string
  clientId: string
  type: "Contract" | "Brief" | "Invoice" | "Agreement" | "Other"
  uploadedDate: string
  size: string
  url: string
}

// ============================================
// DATA
// ============================================

export const attorneys: Attorney[] = [
  {
    id: "ATT-001",
    name: "John Doe",
    specialization: "Criminal & Civil Law",
  },
  {
    id: "ATT-002",
    name: "Sarah Johnson",
    specialization: "Family & Estate Law",
  },
  {
    id: "ATT-003",
    name: "Michael Chen",
    specialization: "Corporate & Commercial Law",
  },
]

export const clients: Client[] = [
  {
    id: "CLT-001",
    name: "James Smith",
    email: "james.smith@email.com",
    phone: "(555) 123-4567",
  },
  {
    id: "CLT-002",
    name: "Maria Johnson",
    email: "maria.johnson@email.com",
    phone: "(555) 234-5678",
  },
  {
    id: "CLT-003",
    name: "Robert Williams",
    email: "robert.williams@email.com",
    phone: "(555) 345-6789",
  },
  {
    id: "CLT-004",
    name: "Rosa Fernandez",
    email: "rosa.fernandez@email.com",
    phone: "(555) 678-9012",
  },
]

export const cases: Case[] = [
  {
    id: "CASE-001",
    title: "Smith v. Johnson",
    clientId: "CLT-001",
    type: "Civil",
    status: "Active",
    openDate: "2024-01-15",
  },
  {
    id: "CASE-002",
    title: "Johnson Property Dispute",
    clientId: "CLT-002",
    type: "Property",
    status: "Pending",
    openDate: "2024-02-10",
  },
  {
    id: "CASE-003",
    title: "Williams Personal Injury Claim",
    clientId: "CLT-003",
    type: "Personal Injury",
    status: "Closed",
    openDate: "2024-03-05",
  },
  {
    id: "CASE-004",
    title: "Fernandez Family Matter",
    clientId: "CLT-004",
    type: "Family",
    status: "Active",
    openDate: "2024-04-12",
  },
]

export const appointments: Appointment[] = [
  {
    id: "APT-001",
    clientId: "CLT-001",
    caseId: "CASE-001",
    type: "Initial Consultation",
    date: "2024-09-15",
    time: "10:00 AM",
    status: "Scheduled",
    location: "Office A",
  },
  {
    id: "APT-002",
    clientId: "CLT-002",
    caseId: "CASE-002",
    type: "Case Review",
    date: "2024-09-16",
    time: "11:30 AM",
    status: "Scheduled",
    location: "Office B",
  },
  {
    id: "APT-003",
    clientId: "CLT-003",
    caseId: "CASE-003",
    type: "Settlement Meeting",
    date: "2024-09-17",
    time: "2:00 PM",
    status: "Completed",
    location: "Conference Room 1",
  },
  {
    id: "APT-004",
    clientId: "CLT-004",
    caseId: "CASE-004",
    type: "Client Consultation",
    date: "2024-09-18",
    time: "9:30 AM",
    status: "Scheduled",
    location: "Office B",
  },
]

export const documents: Document[] = [
  {
    id: "DOC-001",
    name: "Settlement Agreement",
    caseId: "CASE-001",
    clientId: "CLT-001",
    type: "Agreement",
    uploadedDate: "2024-09-10",
    size: "2.4 MB",
    url: "/documents/settlement-agreement.pdf",
  },
  {
    id: "DOC-002",
    name: "Case Brief",
    caseId: "CASE-002",
    clientId: "CLT-002",
    type: "Brief",
    uploadedDate: "2024-09-11",
    size: "1.8 MB",
    url: "/documents/case-brief.pdf",
  },
  {
    id: "DOC-003",
    name: "Contract",
    caseId: "CASE-001",
    clientId: "CLT-001",
    type: "Contract",
    uploadedDate: "2024-09-08",
    size: "3.1 MB",
    url: "/documents/contract.pdf",
  },
  {
    id: "DOC-004",
    name: "Invoice",
    caseId: "CASE-003",
    clientId: "CLT-003",
    type: "Invoice",
    uploadedDate: "2024-09-12",
    size: "0.5 MB",
    url: "/documents/invoice.pdf",
  },
  {
    id: "DOC-005",
    name: "Property Deed",
    caseId: "CASE-002",
    clientId: "CLT-002",
    type: "Other",
    uploadedDate: "2024-09-09",
    size: "2.7 MB",
    url: "/documents/property-deed.pdf",
  },
  {
    id: "DOC-006",
    name: "Family Agreement",
    caseId: "CASE-004",
    clientId: "CLT-004",
    type: "Agreement",
    uploadedDate: "2024-09-13",
    size: "1.2 MB",
    url: "/documents/family-agreement.pdf",
  },
]

// ============================================
// SELECTOR FUNCTIONS (Helper Functions)
// ============================================

export const selectors = {
  // Client selectors
  getAllClients: (): Client[] => clients,

  getClientById: (clientId: string): Client | undefined =>
    clients.find((c) => c.id === clientId),

  getClientCaseCount: (clientId: string): number =>
    cases.filter((c) => c.clientId === clientId).length,

  getAllClientsWithCaseCounts: () =>
    clients.map((client) => ({
      ...client,
      casesCount: selectors.getClientCaseCount(client.id),
    })),

  // Case selectors
  getCaseById: (caseId: string): Case | undefined =>
    cases.find((c) => c.id === caseId),

  getCasesByClientId: (clientId: string): Case[] =>
    cases.filter((c) => c.clientId === clientId),

  getCasesByStatus: (status: "Active" | "Pending" | "Closed"): Case[] =>
    cases.filter((c) => c.status === status),

  getCasesWithDetails: () =>
    cases.map((caseItem) => ({
      ...caseItem,
      client: selectors.getClientById(caseItem.clientId),
    })),

  getRecentCases: (limit = 4) =>
    selectors.getCasesWithDetails().slice(0, limit),

  // Appointment selectors
  getAppointmentById: (appointmentId: string): Appointment | undefined =>
    appointments.find((a) => a.id === appointmentId),

  getAppointmentsByClientId: (clientId: string): Appointment[] =>
    appointments.filter((a) => a.clientId === clientId),

  getAppointmentsByDate: (date: string): Appointment[] =>
    appointments.filter((a) => a.date === date),

  getAppointmentsByStatus: (
    status: "Scheduled" | "Confirmed" | "Completed" | "Pending"
  ): Appointment[] => appointments.filter((a) => a.status === status),

  getAppointmentsWithDetails: () =>
    appointments.map((appointment) => ({
      ...appointment,
      client: selectors.getClientById(appointment.clientId),
      case: appointment.caseId
        ? selectors.getCaseById(appointment.caseId)
        : null,
    })),

  // Document selectors
  getDocumentById: (documentId: string): Document | undefined =>
    documents.find((d) => d.id === documentId),

  getDocumentsByCaseId: (caseId: string): Document[] =>
    documents.filter((d) => d.caseId === caseId),

  getDocumentsByClientId: (clientId: string): Document[] =>
    documents.filter((d) => d.clientId === clientId),

  getDocumentsByType: (
    type: "Contract" | "Brief" | "Invoice" | "Agreement" | "Other"
  ): Document[] => documents.filter((d) => d.type === type),

  getDocumentsWithDetails: () =>
    documents.map((document) => ({
      ...document,
      client: selectors.getClientById(document.clientId),
      case: selectors.getCaseById(document.caseId),
    })),

  // Aggregate statistics
  getStatistics: () => ({
    totalClients: clients.length,
    activeCases: cases.filter((c) => c.status === "Active").length,
    totalDocuments: documents.length,
    upcomingAppointments: appointments.filter(
      (a) => a.status === "Scheduled" || a.status === "Confirmed"
    ).length,
  }),
}
