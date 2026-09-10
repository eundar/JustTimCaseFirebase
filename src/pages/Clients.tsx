"use client"
import { useState } from "react"
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

import { Plus, ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { getAllClientsWithCaseCounts } from "@/lib/derived"
import AddClient from "@/components/dashboard/AddClient"
import { ClientProfile } from "@/components/dashboard/ClientProfile"

export default function Clients() {
  const [open, setOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const {
    clients: allClients,
    loading: clientsLoading,
    error: clientsError,
  } = useClients()
  const {
    cases: allCases,
    loading: casesLoading,
    error: casesError,
  } = useCases()

  if (selectedClientId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClientId(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
        </div>
        <ClientProfile clientId={selectedClientId} />
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

  const clients = getAllClientsWithCaseCounts(allClients, allCases)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage all client information and case associations.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
        <AddClient open={open} onOpenChange={setOpen} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Clients</CardTitle>
          <CardDescription>
            Filter clients by name or contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by name, email, or phone..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {clients.length} total clients in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          {clients.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No Client</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.id}</TableCell>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClientId(client.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
