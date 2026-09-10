import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
import { useClients } from "@/hooks/useClients"
import { useCases } from "@/hooks/useCases"
import { getRecentCases } from "@/lib/derived"

export function RecentCases() {
  const { clients, loading: clientsLoading } = useClients()
  const { cases: allCases, loading: casesLoading } = useCases()

  if (clientsLoading || casesLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  const cases = getRecentCases(allCases, clients)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Cases</CardTitle>

        <CardDescription>Recently updated cases in the system.</CardDescription>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {cases.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>

                <TableCell>{item.client?.name}</TableCell>

                <TableCell>{item.type}</TableCell>

                <TableCell>
                  <Badge
                    variant={
                      item.status === "Closed"
                        ? "secondary"
                        : item.status === "Pending"
                          ? "outline"
                          : "default"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
