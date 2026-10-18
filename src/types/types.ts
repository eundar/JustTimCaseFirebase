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

export interface ConflictMatch {
  matchedName: string
  source: "Existing Client" | "Other Intake"
  description: string
}

export interface ConflictCheckResult {
  hasPotentialConflict: boolean
  matches: ConflictMatch[]
}
