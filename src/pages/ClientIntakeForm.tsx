import { useState, type FormEvent } from "react"
import { useProspectiveClients } from "@/hooks/useClientIntakeForm"
import type { CaseType } from "@/domain/models"
import { ArrowLeft, CheckCircle2, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

export default function ClientIntakeFormPage() {
  const { addProspectiveClient } = useProspectiveClients()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [caseType, setCaseType] = useState<CaseType>("Other")
  const [caseDescription, setCaseDescription] = useState("")
  const [opposingParty, setOpposingParty] = useState("")
  const [privacyAgreementAccepted, setPrivacyAgreementAccepted] =
    useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    if (!privacyAgreementAccepted) {
      setMessage("Please accept the privacy agreement before submitting.")
      return
    }

    setSubmitting(true)

    try {
      await addProspectiveClient({
        fullName,
        email,
        phone,
        caseType,
        caseDescription,
        ...(opposingParty.trim()
          ? { opposingParty: opposingParty.trim() }
          : {}),
        privacyAgreementAccepted,
      })

      setMessage("")
      setFullName("")
      setEmail("")
      setPhone("")
      setCaseType("Other")
      setCaseDescription("")
      setOpposingParty("")
      setPrivacyAgreementAccepted(false)
      setShowSuccessModal(true)
    } catch (error) {
      console.error(error)
      setMessage("Submission failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold">
                Your intake form was submitted
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Thank you for reaching out. Our team will review your request
                and contact you soon. Review may take 2-4 Working days.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <Button
            type="button"
            variant="ghost"
            className="mb-5 -ml-2 text-muted-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft />
            Back
          </Button>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="gap-4 border-b bg-card px-6 py-7 sm:px-8">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scale className="size-5" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Client Intake Form
                </CardTitle>
                <CardDescription className="max-w-xl text-sm leading-relaxed">
                  Tell us a little about yourself and the legal matter you need
                  assistance with. Our team will review your information and
                  follow up with you.
                </CardDescription>
              </div>
              <p className="text-xs text-muted-foreground">
                Fields marked with{" "}
                <span className="font-medium text-foreground">*</span> are
                required.
              </p>
            </CardHeader>

            <CardContent className="px-6 py-7 sm:px-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <section
                  className="space-y-5"
                  aria-labelledby="contact-heading"
                >
                  <div className="space-y-1">
                    <h2
                      id="contact-heading"
                      className="text-base font-semibold"
                    >
                      Your contact information
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      How can we get in touch with you?
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="fullName">Full name *</Label>
                      <Input
                        id="fullName"
                        className="h-11"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        autoComplete="name"
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email address *</Label>
                      <Input
                        id="email"
                        type="email"
                        className="h-11"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        className="h-11"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        autoComplete="tel"
                        maxLength={11}
                        placeholder="Your phone number"
                        required
                      />
                    </div>
                  </div>
                </section>

                <section
                  className="space-y-5 border-t pt-7"
                  aria-labelledby="matter-heading"
                >
                  <div className="space-y-1">
                    <h2 id="matter-heading" className="text-base font-semibold">
                      About your legal matter
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Share the details that will help us understand your needs.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="caseType">Type of legal matter *</Label>
                      <select
                        id="caseType"
                        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        value={caseType}
                        onChange={(event) =>
                          setCaseType(event.target.value as CaseType)
                        }
                        required
                      >
                        {caseTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="caseDescription">
                        Describe your legal matter *
                      </Label>
                      <Textarea
                        id="caseDescription"
                        className="min-h-32 resize-y"
                        rows={5}
                        value={caseDescription}
                        onChange={(event) =>
                          setCaseDescription(event.target.value)
                        }
                        placeholder="Briefly describe what happened and how we can help."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="opposingParty">
                        Opposing party{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="opposingParty"
                        className="h-11"
                        value={opposingParty}
                        onChange={(event) =>
                          setOpposingParty(event.target.value)
                        }
                        placeholder="Name of the other party, if applicable"
                      />
                    </div>
                  </div>
                </section>

                <section
                  className="space-y-5 border-t pt-7"
                  aria-labelledby="privacy-heading"
                >
                  <h2 id="privacy-heading" className="text-base font-semibold">
                    Privacy agreement
                  </h2>
                  <label
                    htmlFor="privacyAgreementAccepted"
                    className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4"
                  >
                    <input
                      id="privacyAgreementAccepted"
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                      checked={privacyAgreementAccepted}
                      onChange={(event) =>
                        setPrivacyAgreementAccepted(event.target.checked)
                      }
                      required
                    />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      I acknowledge and agree to the privacy notice regarding
                      the collection and processing of the information I submit.{" "}
                      <span className="font-medium text-foreground">*</span>
                    </span>
                  </label>
                </section>

                {message && (
                  <p
                    role="status"
                    aria-live="polite"
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      message.startsWith("Your intake form")
                        ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
                        : "border-destructive/30 bg-destructive/5 text-destructive"
                    }`}
                  >
                    {message}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full text-sm font-semibold"
                >
                  {submitting ? "Submitting..." : "Submit Intake"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Submitting this form does not create an attorney-client
            relationship.
          </p>
        </div>
      </main>
    </>
  )
}
