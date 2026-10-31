/**
 * PulseClinic AI - Calendar REST API Service & Concurrency Controller
 * Handles doctor schedules, slot locking, booking generation, cancellations, and authorized rebookings.
 */

import { Appointment, DoctorSlot, RebookingRequest } from '../types/index.ts';
import { clinicStore } from './store.ts';
import { sendAppointmentEmail } from './email.ts';

export class CalendarService {
  // Check doctor availability
  static getDoctorAvailability(doctorId: string, date?: string) {
    const doctor = clinicStore.getDoctorById(doctorId);
    if (!doctor) {
      throw new Error(`Doctor not found with ID: ${doctorId}`);
    }

    const slots = clinicStore.getDoctorSlots(doctorId, date);
    return {
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        status: doctor.status,
      },
      date: date || 'next_7_days',
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => !s.isBooked),
    };
  }

  // Create appointment with atomic slot reservation & double-booking prevention
  static async bookAppointment(params: {
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    slotId: string;
    chiefComplaint: string;
    urgency: Appointment['urgency'];
    sessionId?: string;
  }): Promise<{ appointment: Appointment; emailNotificationId?: string }> {
    const sessionId = params.sessionId || `session-${Date.now()}`;
    const reservation = await clinicStore.reserveSlot(params.slotId, sessionId);

    if (!reservation.success || !reservation.slot) {
      throw new Error(reservation.error || 'Failed to reserve appointment slot.');
    }

    const slot = reservation.slot;
    const doctor = clinicStore.getDoctorById(slot.doctorId);
    if (!doctor) {
      clinicStore.releaseSlot(params.slotId);
      throw new Error('Associated doctor record could not be found.');
    }

    // Generate guaranteed unique booking ID
    const bookingCode = Math.floor(100000 + Math.random() * 900000);
    const bookingId = `BK-${bookingCode}`;

    const appointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bookingId,
      patientId: params.patientId,
      patientName: params.patientName,
      patientEmail: params.patientEmail,
      patientPhone: params.patientPhone,
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      date: slot.date,
      time: slot.startTime,
      durationMinutes: doctor.slotDurationMinutes,
      clinicName: process.env.CLINIC_NAME || 'PulseCare Medical Center',
      clinicAddress: process.env.CLINIC_ADDRESS || '742 Evergreen Terrace, Medical Suite 400',
      status: 'CONFIRMED',
      urgency: params.urgency,
      chiefComplaint: params.chiefComplaint,
      patientAuthorizedRebooking: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clinicStore.saveAppointment(appointment);

    // Send confirmation email asynchronously with provider status tracking
    let emailRecord;
    try {
      emailRecord = await sendAppointmentEmail({
        appointment,
        type: 'BOOKING_CONFIRMATION',
      });
      appointment.emailNotificationId = emailRecord.id;
      clinicStore.saveAppointment(appointment);
    } catch (err) {
      console.error('[CalendarService] Failed to dispatch booking email:', err);
    }

    return { appointment, emailNotificationId: emailRecord?.id };
  }

  // Cancel an appointment
  static async cancelAppointment(
    appointmentId: string,
    reason: string = 'Doctor schedule change or patient request'
  ): Promise<Appointment> {
    const apt = clinicStore.getAppointmentById(appointmentId);
    if (!apt) {
      throw new Error(`Appointment not found: ${appointmentId}`);
    }

    // Free the corresponding slot
    const slots = clinicStore.getDoctorSlots(apt.doctorId, apt.date);
    const bookedSlot = slots.find((s) => s.startTime === apt.time);
    if (bookedSlot) {
      clinicStore.releaseSlot(bookedSlot.slotId);
    }

    const updated = clinicStore.updateAppointmentStatus(appointmentId, 'CANCELLED', reason);
    if (!updated) {
      throw new Error('Failed to update appointment status to CANCELLED.');
    }

    // Dispatch cancellation email
    try {
      await sendAppointmentEmail({
        appointment: updated,
        type: 'APPOINTMENT_CANCELLED',
        notes: reason,
      });
    } catch (err) {
      console.error('[CalendarService] Error dispatching cancellation email:', err);
    }

    return updated;
  }

  // Find alternative slots for a cancelled or rebooking appointment
  static findAlternativeSlots(appointmentId: string): DoctorSlot[] {
    const apt = clinicStore.getAppointmentById(appointmentId);
    if (!apt) {
      throw new Error(`Appointment ${appointmentId} not found.`);
    }

    // First attempt to find open slots with the SAME doctor
    const sameDoctorSlots = clinicStore
      .getDoctorSlots(apt.doctorId)
      .filter((s) => !s.isBooked && (s.date > apt.date || (s.date === apt.date && s.startTime > apt.time)));

    if (sameDoctorSlots.length >= 3) {
      return sameDoctorSlots.slice(0, 6);
    }

    // If few slots, include peer doctors in the SAME specialty
    const specialtySlots = clinicStore
      .getAllAvailableSlots(apt.doctorSpecialty)
      .filter((s) => !s.isBooked && s.date >= apt.date);

    return specialtySlots.slice(0, 8);
  }

  // Rebook an appointment with explicit patient authorization
  static async rebookAppointment(params: {
    appointmentId: string;
    newSlotId: string;
    authorizedByPatient: boolean;
    reason?: string;
  }): Promise<{ newAppointment: Appointment; previousAppointment: Appointment }> {
    if (!params.authorizedByPatient) {
      throw new Error('Rebooking cannot proceed without explicit patient authorization.');
    }

    const oldApt = clinicStore.getAppointmentById(params.appointmentId);
    if (!oldApt) {
      throw new Error(`Appointment ${params.appointmentId} not found.`);
    }

    // Reserve new slot atomically
    const reservation = await clinicStore.reserveSlot(params.newSlotId, `rebook-${Date.now()}`);
    if (!reservation.success || !reservation.slot) {
      throw new Error(reservation.error || 'Selected replacement slot is no longer available.');
    }

    const newSlot = reservation.slot;
    const newDoctor = clinicStore.getDoctorById(newSlot.doctorId);
    if (!newDoctor) {
      clinicStore.releaseSlot(params.newSlotId);
      throw new Error('Doctor for replacement slot could not be identified.');
    }

    // Release old slot
    const oldSlots = clinicStore.getDoctorSlots(oldApt.doctorId, oldApt.date);
    const oldSlot = oldSlots.find((s) => s.startTime === oldApt.time);
    if (oldSlot) {
      clinicStore.releaseSlot(oldSlot.slotId);
    }

    // Mark old appointment as REBOOKED
    clinicStore.updateAppointmentStatus(
      oldApt.id,
      'REBOOKED',
      `Rebooked to ${newSlot.date} at ${newSlot.startTime} with ${newDoctor.name}`
    );

    // Create new appointment
    const newBookingCode = Math.floor(100000 + Math.random() * 900000);
    const newBookingId = `BK-${newBookingCode}`;

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bookingId: newBookingId,
      patientId: oldApt.patientId,
      patientName: oldApt.patientName,
      patientEmail: oldApt.patientEmail,
      patientPhone: oldApt.patientPhone,
      doctorId: newDoctor.id,
      doctorName: newDoctor.name,
      doctorSpecialty: newDoctor.specialty,
      date: newSlot.date,
      time: newSlot.startTime,
      durationMinutes: newDoctor.slotDurationMinutes,
      clinicName: oldApt.clinicName,
      clinicAddress: oldApt.clinicAddress,
      status: 'CONFIRMED',
      urgency: oldApt.urgency,
      chiefComplaint: oldApt.chiefComplaint,
      rescheduledFromBookingId: oldApt.bookingId,
      rebookingNotes: params.reason || 'Doctor emergency rescheduling / patient authorized',
      patientAuthorizedRebooking: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    clinicStore.saveAppointment(newAppointment);

    // Record rebooking request in audit store
    const rebookingRecord: RebookingRequest = {
      id: `rebook-req-${Date.now()}`,
      originalAppointmentId: oldApt.id,
      originalBookingId: oldApt.bookingId,
      patientId: oldApt.patientId,
      patientName: oldApt.patientName,
      patientEmail: oldApt.patientEmail,
      cancelledDoctorId: oldApt.doctorId,
      cancelledDoctorName: oldApt.doctorName,
      specialty: oldApt.doctorSpecialty,
      cancellationReason: params.reason || 'Doctor schedule adjustment',
      status: 'AUTO_REBOOKED',
      proposedSlot: {
        doctorId: newDoctor.id,
        doctorName: newDoctor.name,
        date: newSlot.date,
        time: newSlot.startTime,
      },
      newAppointmentId: newAppointment.id,
      newBookingId: newAppointment.bookingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clinicStore.saveRebookingRequest(rebookingRecord);

    // Dispatch rescheduling email
    try {
      await sendAppointmentEmail({
        appointment: newAppointment,
        type: 'APPOINTMENT_RESCHEDULED',
        previousBookingId: oldApt.bookingId,
        notes: params.reason,
      });
    } catch (err) {
      console.error('[CalendarService] Failed to dispatch rebooking email:', err);
    }

    return { newAppointment, previousAppointment: oldApt };
  }
}
