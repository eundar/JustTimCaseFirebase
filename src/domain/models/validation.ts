import type {
  Appointment,
  AttorneyProfile,
  Case,
  CaseType,
  Client,
  DocumentRecord,
  DocumentType,
  ProspectiveClient,
} from "@/domain/models"

type DataRecord = Record<string, unknown>

const caseTypes: CaseType[] = [
  "Criminal",
  "Civil",
  "Family",
  "Corporate",
  "Labor",
  "Property",
  "Immigration",
  "Intellectual Property",
  "Other",
]

const documentTypes: DocumentType[] = [
  "Contract",
  "Brief",
  "Invoice",
  "Agreement",
  "Other",
]

function asRecord(value: unknown, entity: string): DataRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${entity} record: expected an object.`)
  }
  return value as DataRecord
}

function requiredString(data: DataRecord, key: string, entity: string): string {
  const value = data[key]
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid ${entity} record: "${key}" must be a non-empty string.`
    )
  }
  return value
}

function optionalString(data: DataRecord, key: string, entity: string) {
  const value = data[key]
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`Invalid ${entity} record: "${key}" must be a string.`)
  }
  return value as string | undefined
}

function stringValue(data: DataRecord, key: string, entity: string): string {
  const value = data[key]
  if (typeof value !== "string") {
    throw new Error(`Invalid ${entity} record: "${key}" must be a string.`)
  }
  return value
}

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  key: string,
  entity: string
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(
      `Invalid ${entity} record: "${key}" has an unsupported value.`
    )
  }
  return value as T
}

function parseOwner(id: string, value: unknown, entity: string) {
  const data = asRecord(value, entity)
  const ownerId = requiredString(data, "ownerId", entity)
  return { data, ownerId, id }
}

export function parseClient(id: string, value: unknown): Client {
  const { data, ownerId } = parseOwner(id, value, "client")
  return {
    id,
    ownerId,
    name: requiredString(data, "name", "client"),
    email: requiredString(data, "email", "client"),
    phone: requiredString(data, "phone", "client"),
  }
}

export function parseAttorneyProfile(value: unknown): AttorneyProfile {
  const data = asRecord(value, "attorney profile")
  return {
    name: requiredString(data, "name", "attorney profile"),
    specialization: requiredString(data, "specialization", "attorney profile"),
    email: requiredString(data, "email", "attorney profile"),
  }
}

export function parseCase(id: string, value: unknown): Case {
  const { data, ownerId } = parseOwner(id, value, "case")
  const opposingParty = optionalString(data, "opposingParty", "case")
  return {
    id,
    ownerId,
    title: requiredString(data, "title", "case"),
    clientId: requiredString(data, "clientId", "case"),
    // Older cases were saved without a clientName (or with ""), so tolerate it.
    clientName: optionalString(data, "clientName", "case") ?? "",
    ...(opposingParty === undefined ? {} : { opposingParty }),
    type: enumValue(data.type, caseTypes, "type", "case"),
    status: enumValue(
      data.status,
      ["Active", "Pending", "Closed"],
      "status",
      "case"
    ),
    openDate: requiredString(data, "openDate", "case"),
  }
}

export function parseAppointment(id: string, value: unknown): Appointment {
  const { data, ownerId } = parseOwner(id, value, "appointment")
  const caseId = data.caseId
  if (caseId !== null && typeof caseId !== "string") {
    throw new Error(
      'Invalid appointment record: "caseId" must be a string or null.'
    )
  }
  return {
    id,
    ownerId,
    clientId: requiredString(data, "clientId", "appointment"),
    caseId,
    type: requiredString(data, "type", "appointment"),
    date: requiredString(data, "date", "appointment"),
    time: requiredString(data, "time", "appointment"),
    status: enumValue(
      data.status,
      ["Scheduled", "Confirmed", "Completed", "Pending"],
      "status",
      "appointment"
    ),
    location: requiredString(data, "location", "appointment"),
  }
}

const googleDriveHosts = ["drive.google.com", "docs.google.com"]

// Documents can be stored as links to Google Drive / Docs instead of uploads.
export function isGoogleDriveUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" && googleDriveHosts.includes(url.hostname)
  } catch {
    return false
  }
}

export function parseDocumentRecord(
  id: string,
  value: unknown
): DocumentRecord {
  const { data, ownerId } = parseOwner(id, value, "document")
  return {
    id,
    ownerId,
    name: requiredString(data, "name", "document"),
    caseId: requiredString(data, "caseId", "document"),
    clientId: requiredString(data, "clientId", "document"),
    type: enumValue(data.type, documentTypes, "type", "document"),
    uploadedDate: requiredString(data, "uploadedDate", "document"),
    size: requiredString(data, "size", "document"),
    url: requiredString(data, "url", "document"),
    storagePath: stringValue(data, "storagePath", "document"),
  }
}

export function parseProspectiveClient(
  id: string,
  value: unknown
): ProspectiveClient {
  const data = asRecord(value, "prospective client")
  const opposingParty = optionalString(
    data,
    "opposingParty",
    "prospective client"
  )
  if (data.privacyAgreementAccepted !== true) {
    throw new Error(
      'Invalid prospective client record: "privacyAgreementAccepted" must be true.'
    )
  }
  return {
    id,
    fullName: requiredString(data, "fullName", "prospective client"),
    email: requiredString(data, "email", "prospective client"),
    phone: requiredString(data, "phone", "prospective client"),
    caseType: enumValue(
      data.caseType,
      caseTypes,
      "caseType",
      "prospective client"
    ),
    caseDescription: requiredString(
      data,
      "caseDescription",
      "prospective client"
    ),
    ...(opposingParty === undefined ? {} : { opposingParty }),
    privacyAgreementAccepted: true,
    status: enumValue(
      data.status,
      ["Pending Review", "Accepted", "Declined"],
      "status",
      "prospective client"
    ),
    createdAt: requiredString(data, "createdAt", "prospective client"),
  }
}
