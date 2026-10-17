import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useProspectiveClients } from "@/hooks/useClientIntakeForm"
import type { ConflictCheckResult } from "@/types/types"

type IntakeStatus = "All" | "Pending Review" | "Accepted" | "Declined"

export default function IntakeForms() {
  const {
    prospectiveClients,
    loading,
    acceptProspectiveClient,
    rejectProspectiveClient,
    checkConflictOfInterest,
  } = useProspectiveClients()

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState("")

  const [conflictResults, setConflictResults] = useState<
    Record<string, ConflictCheckResult>
  >({})
  const [checkingId, setCheckingId] = useState<string | null>(null)

  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<IntakeStatus>("Pending Review")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredClients = prospectiveClients.filter((client) => {
    const matchesSearch =
      client.fullName.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase()) ||
      client.caseType.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "All" || client.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const selectedClient = prospectiveClients.find(
    (client) => client.id === selectedId
  )

  const pendingCount = prospectiveClients.filter(
    (client) => client.status === "Pending Review"
  ).length

  // const acceptedCount = prospectiveClients.filter(
  //   (client) => client.status === "Accepted"
  // ).length

  // const declinedCount = prospectiveClients.filter(
  //   (client) => client.status === "Declined"
  // ).length

  async function handleAccept(id: string) {
    setProcessingId(id)
    setActionMessage("")

    try {
      await acceptProspectiveClient(id)
      setActionMessage("Intake accepted successfully.")
    } catch (error) {
      console.error(error)
      setActionMessage("Failed to accept intake. Please try again.")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDecline(id: string) {
    setProcessingId(id)
    setActionMessage("")

    try {
      await rejectProspectiveClient(id)
      setActionMessage("Intake declined successfully.")
    } catch (error) {
      console.error(error)
      setActionMessage("Failed to decline intake. Please try again.")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleCheckConflict(id: string) {
    setCheckingId(id)
    setActiveConflictId(id)
    setConflictModalOpen(true)

    try {
      const result = await checkConflictOfInterest(id)

      setConflictResults((previous) => ({
        ...previous,
        [id]: result,
      }))
    } catch (error) {
      console.error("Conflict check failed:", error)
    } finally {
      setCheckingId(null)
    }
  }

  if (loading) {
    return <main className="p-6">Loading intake forms...</main>
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">Client Intake Forms</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review and manage prospective client submissions.
        </p>
      </header>

      {actionMessage && (
        <p role="status" aria-live="polite" className="text-sm">
          {actionMessage}
        </p>
      )}

      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Forms</p>
          <p className="mt-2 text-2xl font-bold">{prospectiveClients.length}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Pending Review</p>
          <p className="mt-2 text-2xl font-bold">{pendingCount}</p>
        </div>

        {/* <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Accepted / Declined</p>
          <p className="mt-2 text-2xl font-bold">
            {acceptedCount} / {declinedCount}
          </p>
        </div> */}
      </section>

      {/* Search and filter */}
      <section className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search by name, email, or case type..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as IntakeStatus)
          }
          className="rounded-md border px-3 py-2"
        >
          <option value="All">All statuses</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Accepted">Accepted</option>
          <option value="Declined">Declined</option>
        </select>
      </section>

      {/* Intake forms table */}
      <section className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3">Prospective Client</th>
              <th className="p-3">Case Type</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id} className="border-t">
                <td className="p-3">
                  <p className="font-medium">{client.fullName}</p>
                  <p className="text-muted-foreground">{client.email}</p>
                </td>

                <td className="p-3">{client.caseType}</td>

                <td className="p-3">
                  {new Date(client.createdAt).toLocaleDateString()}
                </td>

                <td className="p-3">{client.status}</td>

                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(client.id)}
                    >
                      View details
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={checkingId !== null}
                      onClick={() => handleCheckConflict(client.id)}
                    >
                      {checkingId === client.id
                        ? "Checking..."
                        : "Check Conflict"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredClients.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No intake forms found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <Dialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        {selectedClient && (
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader className="pr-8">
              <DialogTitle>{selectedClient.fullName}</DialogTitle>
              <DialogDescription>
                Submitted intake form details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 overflow-y-auto">
              <section className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="font-medium break-all">
                    {selectedClient.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Phone
                  </p>
                  <p className="font-medium">{selectedClient.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Case type
                  </p>
                  <p className="font-medium">{selectedClient.caseType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Submitted
                  </p>
                  <p className="font-medium">
                    {new Date(selectedClient.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Opposing party
                  </p>
                  <p className="font-medium">
                    {selectedClient.opposingParty || "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>
                  <p className="font-medium">{selectedClient.status}</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Matter description</h3>
                <p className="max-h-48 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedClient.caseDescription}
                </p>
              </section>

              <p className="text-xs text-muted-foreground">
                Privacy agreement:{" "}
                {selectedClient.privacyAgreementAccepted
                  ? "Accepted"
                  : "Not accepted"}
              </p>
            </div>

            {selectedClient.status === "Pending Review" && (
              <DialogFooter className="sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={processingId !== null}
                  onClick={() => handleAccept(selectedClient.id)}
                >
                  {processingId === selectedClient.id
                    ? "Processing..."
                    : "Accept"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={processingId !== null}
                  onClick={() => handleDecline(selectedClient.id)}
                >
                  {processingId === selectedClient.id
                    ? "Processing..."
                    : "Decline"}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      {conflictModalOpen && activeConflictId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConflictModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-modal-title"
            className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="conflict-modal-title" className="text-xl font-semibold">
                Conflict Check Results
              </h2>

              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="rounded-md border px-3 py-1"
              >
                Close
              </button>
            </div>

            {checkingId === activeConflictId ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Checking for potential conflicts...
              </p>
            ) : conflictResults[activeConflictId] ? (
              conflictResults[activeConflictId].hasPotentialConflict ? (
                <div className="mt-5 space-y-3">
                  <p className="font-medium text-red-600">
                    Potential matches found
                  </p>

                  <ul className="space-y-3">
                    {conflictResults[activeConflictId].matches.map(
                      (match, index) => (
                        <li
                          key={`${match.source}-${match.matchedName}-${index}`}
                          className="rounded-lg border p-3"
                        >
                          <p className="font-medium">{match.matchedName}</p>
                          <p className="text-sm text-muted-foreground">
                            {match.source}
                          </p>
                          <p className="mt-1 text-sm">{match.description}</p>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ) : (
                <p className="mt-5 rounded-lg border p-4 text-sm">
                  No potential matches found in the records checked.
                </p>
              )
            ) : (
              <p className="mt-5 text-sm text-red-600">
                The conflict check failed. Please close this modal and try
                again.
              </p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              These results are preliminary screening information, not a final
              determination that a legal conflict exists or does not exist.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
