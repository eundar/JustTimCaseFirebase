import type { Appointment } from "@/domain/models"
import { parseAppointment } from "@/domain/models/validation"
import { OwnedFirestoreRepository } from "./OwnedFirestoreRepository"

export class AppointmentRepository extends OwnedFirestoreRepository<Appointment> {
  constructor() {
    super("appointments", parseAppointment)
  }
}

export const appointmentRepository = new AppointmentRepository()
