"use client"

import { useState } from "react"
import { useSearchParams } from "react-router"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { Plus, FileText, Download, Trash2 } from "lucide-react"
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { useDocuments } from "@/hooks/useDocuments"
import { getDocumentsWithDetails } from "@/lib/derived"
import { matchesSearch } from "@/lib/utils"
import AddDocument from "@/components/dashboard/AddDocument"

export default function Documents() {
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const { clients, loading: clientsLoading, error: clientsError } = useClients()
  const { cases, loading: casesLoading, error: casesError } = useCases()
  const {
    documents: allDocuments,
    loading: documentsLoading,
    error: documentsError,
    deleteDocument,
  } = useDocuments()

  if (clientsError || casesError || documentsError) {
    return (
      <p className="text-sm text-red-500">
        Failed to load data. Please try again later.
      </p>
    )
  }

  if (clientsLoading || casesLoading || documentsLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const documents = getDocumentsWithDetails(allDocuments, clients, cases).filter(
    (doc) =>
      matchesSearch(search, [
        doc.name,
        doc.case?.title,
        doc.caseId,
        doc.type,
      ])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage and organize all case-related documents and files.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
        <AddDocument open={open} onOpenChange={setOpen} />
      </div>

      {deleteError && (
        <p className="text-sm text-red-500">{deleteError}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search Documents</CardTitle>
          <CardDescription>
            Filter documents by name, case, or type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by document name, case ID, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>All uploaded documents and files</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <FileText className="h-4 w-4" />
                </TableHead>
                <TableHead>Document Name</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.case?.title ?? doc.caseId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell>{doc.uploadedDate}</TableCell>
                    <TableCell>{doc.size}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            deleteDocument(doc.id, doc.storagePath).catch(
                              (err) =>
                                setDeleteError(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to delete document"
                                )
                            )
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {search
                      ? "No documents match your search."
                      : "No documents found. Upload a new document to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
