import type { Client, Case, Appointment, DocumentRecord } from "@/types/models"

export function getClientById(
  clients: Client[],
  clientId: string
): Client | undefined {
  return clients.find((c) => c.id === clientId)
}

export function getClientCaseCount(cases: Case[], clientId: string): number {
  return cases.filter((c) => c.clientId === clientId).length
}

export function getAllClientsWithCaseCounts(
  clients: Client[],
  cases: Case[]
): (Client & { casesCount: number })[] {
  return clients.map((client) => ({
    ...client,
    casesCount: getClientCaseCount(cases, client.id),
  }))
}

export function getCaseById(cases: Case[], caseId: string): Case | undefined {
  return cases.find((c) => c.id === caseId)
}

export function getCasesByClientId(cases: Case[], clientId: string): Case[] {
  return cases.filter((c) => c.clientId === clientId)
}

export function getCasesWithDetails(
  cases: Case[],
  clients: Client[]
): (Case & { client: Client | undefined })[] {
  return cases.map((caseItem) => ({
    ...caseItem,
    client: getClientById(clients, caseItem.clientId),
  }))
}

export function getRecentCases(
  cases: Case[],
  clients: Client[],
  limit = 4
): (Case & { client: Client | undefined })[] {
  return getCasesWithDetails(cases, clients).slice(0, limit)
}

export function getAppointmentsByClientId(
  appointments: Appointment[],
  clientId: string
): Appointment[] {
  return appointments.filter((a) => a.clientId === clientId)
}

export function getAppointmentsWithDetails(
  appointments: Appointment[],
  clients: Client[],
  cases: Case[]
): (Appointment & {
  client: Client | undefined
  case: Case | null | undefined
})[] {
  return appointments.map((appointment) => ({
    ...appointment,
    client: getClientById(clients, appointment.clientId),
    case: appointment.caseId ? getCaseById(cases, appointment.caseId) : null,
  }))
}

export function getDocumentsByCaseId(
  documents: DocumentRecord[],
  caseId: string
): DocumentRecord[] {
  return documents.filter((d) => d.caseId === caseId)
}

export function getDocumentsByClientId(
  documents: DocumentRecord[],
  clientId: string
): DocumentRecord[] {
  return documents.filter((d) => d.clientId === clientId)
}

export function getDocumentsWithDetails(
  documents: DocumentRecord[],
  clients: Client[],
  cases: Case[]
): (DocumentRecord & {
  client: Client | undefined
  case: Case | undefined
})[] {
  return documents.map((document) => ({
    ...document,
    client: getClientById(clients, document.clientId),
    case: getCaseById(cases, document.caseId),
  }))
}

export function getStatistics(
  clients: Client[],
  cases: Case[],
  appointments: Appointment[],
  documents: DocumentRecord[]
) {
  return {
    totalClients: clients.length,
    activeCases: cases.filter((c) => c.status === "Active").length,
    totalDocuments: documents.length,
    upcomingAppointments: appointments.filter(
      (a) => a.status === "Scheduled" || a.status === "Confirmed"
    ).length,
  }
}
