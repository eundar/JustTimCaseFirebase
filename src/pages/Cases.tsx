"use client"

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
import { Plus, ArrowLeft } from "lucide-react"
import { selectors } from "@/data/mockData.ts"

import { useState } from "react"
import AddCase from "@/components/dashboard/AddCase.tsx"
import { CaseProfile } from "@/components/dashboard/CaseProfile"

const cases = selectors.getCasesWithDetails()

export default function Cases() {
  const [open, setOpen] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

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
          <Input placeholder="Search by case ID, title, or client..." />
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
