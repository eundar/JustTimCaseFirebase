"use client"

import { useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ArrowLeft } from "lucide-react"

import { useState } from "react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { getCasesWithDetails } from "@/lib/derived"
import { matchesSearch } from "@/lib/utils"
import AddCase from "@/components/dashboard/AddCase.tsx"
import { CaseProfile } from "@/components/dashboard/CaseProfile"

export default function Cases() {
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const { clients, loading: clientsLoading, error: clientsError } = useClients()
  const {
    cases: allCases,
    loading: casesLoading,
    error: casesError,
  } = useCases()

  if (selectedCaseId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCaseId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cases
          </Button>
        </div>
        <CaseProfile caseId={selectedCaseId} />
      </div>
    )
  }

  if (clientsError || casesError) {
    return (
      <p className="text-sm text-red-500">
        Failed to load data. Please try again later.
      </p>
    )
  }

  if (clientsLoading || casesLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const cases = getCasesWithDetails(allCases, clients).filter((caseItem) =>
    matchesSearch(search, [caseItem.id, caseItem.title, caseItem.client?.name])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground">
            Track and manage all active and closed cases.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Button>
        <AddCase open={open} onOpenChange={setOpen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Cases</CardTitle>
          <CardDescription>
            Filter cases by ID, title, or client name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by case ID, title, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Cases</CardTitle>
          <CardDescription>
            {cases.length} total cases in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Open Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {cases.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {search ? "No cases match your search." : "No cases found."}
                  </TableCell>
                </TableRow>
              )}
              {cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell className="font-medium">{caseItem.id}</TableCell>
                  <TableCell>{caseItem.title}</TableCell>
                  <TableCell>{caseItem.client?.name}</TableCell>
                  <TableCell>{caseItem.type}</TableCell>
                  <TableCell>{caseItem.openDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        caseItem.status === "Closed"
                          ? "secondary"
                          : caseItem.status === "Pending"
                            ? "outline"
                            : "default"
                      }
                    >
                      {caseItem.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCaseId(caseItem.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
