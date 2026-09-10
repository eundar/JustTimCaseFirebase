"use client"

import { useState } from "react"
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
import AddDocument from "@/components/dashboard/AddDocument"

export default function Documents() {
  const [open, setOpen] = useState(false)
  const { clients, loading: clientsLoading } = useClients()
  const { cases, loading: casesLoading } = useCases()
  const {
    documents: allDocuments,
    loading: documentsLoading,
    deleteDocument,
  } = useDocuments()

  if (clientsLoading || casesLoading || documentsLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  const documents = getDocumentsWithDetails(allDocuments, clients, cases)

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

      <Card>
        <CardHeader>
          <CardTitle>Search Documents</CardTitle>
          <CardDescription>
            Filter documents by name, case, or type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by document name, case ID, or type..." />
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
                          onClick={() =>
                            deleteDocument(doc.id, doc.storagePath)
                          }
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
                    No documents found. Upload a new document to get started.
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
