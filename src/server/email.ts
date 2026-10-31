/**
 * PulseClinic AI - Resend Email Integration
 * Formats responsive, accessible healthcare transactional emails with idempotency tracking
 * NEVER includes medical histories, symptoms, or diagnoses in email bodies for patient privacy.
 */

import { Resend } from 'resend';
import { Appointment, EmailNotification } from '../types/index.ts';
import { clinicStore } from './store.ts';

// Initialize Resend Client if API key is provided
const RESEND_API_KEY = process.env.RESEND_API_KEY;
let resendClient: Resend | null = null;

if (RESEND_API_KEY && RESEND_API_KEY.startsWith('re_')) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('[EmailService] Resend SDK initialized successfully.');
  } catch (err) {
    console.error('[EmailService] Failed to initialize Resend:', err);
  }
} else {
  console.log('[EmailService] Resend API key not configured or format invalid. Standing by.');
}

// Generate HTML email template
export function generateBookingConfirmationHtml(params: {
  patientName: string;
  bookingId: string;
  doctorName: string;
  doctorSpecialty: string;
  clinicName: string;
  clinicAddress: string;
  date: string;
  time: string;
  isReschedule?: boolean;
  previousBookingId?: string;
}): string {
  const title = params.isReschedule
    ? 'Your Clinic Appointment Has Been Rescheduled'
    : 'Your Clinic Appointment Is Confirmed!';
  const headerBadge = params.isReschedule ? 'RESCHEDULED CONFIRMATION' : 'BOOKING CONFIRMATION';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px; text-transform: uppercase; }
    .content { padding: 32px 28px; }
    .card { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #0d9488; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-size: 14px; font-weight: 500; }
    .val { color: #0f172a; font-size: 14px; font-weight: 600; text-align: right; }
    .alert-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 14px; margin-top: 24px; font-size: 13px; color: #1e40af; }
    .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="badge">${headerBadge}</span>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${params.clinicName}</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Appointment Details & Verification</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${params.patientName}</strong>,</p>
      <p style="color: #475569;">
        ${params.isReschedule
          ? `Your appointment has been successfully rebooked. Please note your updated consultation schedule below.`
          : `We are pleased to confirm your upcoming clinical consultation. Below is your official booking confirmation.`
        }
      </p>

      <div class="card">
        <div class="row">
          <span class="label">Official Booking ID</span>
          <span class="val" style="color: #0d9488; font-family: monospace; font-size: 16px;">${params.bookingId}</span>
        </div>
        ${params.previousBookingId ? `
        <div class="row">
          <span class="label">Previous Booking Reference</span>
          <span class="val" style="text-decoration: line-through; color: #94a3b8;">${params.previousBookingId}</span>
        </div>` : ''}
        <div class="row">
          <span class="label">Consulting Doctor</span>
          <span class="val">${params.doctorName}</span>
        </div>
        <div class="row">
          <span class="label">Clinical Specialty</span>
          <span class="val">${params.doctorSpecialty}</span>
        </div>
        <div class="row">
          <span class="label">Date of Appointment</span>
          <span class="val">${params.date}</span>
        </div>
        <div class="row">
          <span class="label">Scheduled Time</span>
          <span class="val">${params.time} (Local Time)</span>
        </div>
        <div class="row">
          <span class="label">Clinic Location</span>
          <span class="val">${params.clinicAddress}</span>
        </div>
      </div>

      <div class="alert-box">
        <strong>Important Patient Instructions:</strong>
        <ul style="margin: 6px 0 0; padding-left: 18px;">
          <li>Please arrive <strong>15 minutes prior</strong> to your appointment for registration and vital check.</li>
          <li>Bring a valid photo ID and insurance card if applicable.</li>
          <li>For privacy protection, your symptom details are kept strictly on your clinical record and not emailed.</li>
        </ul>
      </div>

      <p style="margin-top: 24px; font-size: 14px; color: #475569;">
        If you need to make changes or have questions, please access your Patient Portal or call our front desk.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">${params.clinicName} • Autonomous Clinic Intake & Booking System</p>
      <p style="margin: 4px 0 0;">This is an automated notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Dispatches confirmation email using Resend
export async function sendAppointmentEmail(params: {
  appointment: Appointment;
  type: 'BOOKING_CONFIRMATION' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_CANCELLED';
  previousBookingId?: string;
  notes?: string;
}): Promise<EmailNotification> {
  const { appointment, type } = params;
  const isReschedule = type === 'APPOINTMENT_RESCHEDULED';
  const isCancel = type === 'APPOINTMENT_CANCELLED';

  const subject = isCancel
    ? `Clinic Appointment Update: Booking ${appointment.bookingId} Cancelled`
    : isReschedule
    ? `Your Clinic Appointment Has Been Rescheduled (ID: ${appointment.bookingId})`
    : 'Your Clinic Appointment Is Confirmed!';

  const notifId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const idempotencyKey = `${appointment.bookingId}-${type}-${Date.now()}`;

  const htmlContent = generateBookingConfirmationHtml({
    patientName: appointment.patientName,
    bookingId: appointment.bookingId,
    doctorName: appointment.doctorName,
    doctorSpecialty: appointment.doctorSpecialty,
    clinicName: appointment.clinicName,
    clinicAddress: appointment.clinicAddress,
    date: appointment.date,
    time: appointment.time,
    isReschedule,
    previousBookingId: params.previousBookingId,
  });

  const notificationRecord: EmailNotification = {
    id: notifId,
    appointmentId: appointment.id,
    bookingId: appointment.bookingId,
    recipientEmail: appointment.patientEmail,
    recipientName: appointment.patientName,
    subject,
    type,
    status: 'PENDING',
    idempotencyKey,
    sentAt: new Date().toISOString(),
    retryCount: 0,
  };

  // Check if Resend is connected
  if (!resendClient) {
    notificationRecord.status = 'NOT_CONNECTED';
    notificationRecord.error = 'Resend API key not configured or format invalid (requires RESEND_API_KEY)';
    clinicStore.saveEmailNotification(notificationRecord);
    return notificationRecord;
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || 'PulseCare Clinic <onboarding@resend.dev>';
    const res = await resendClient.emails.send({
      from: fromAddress,
      to: [appointment.patientEmail],
      subject,
      html: htmlContent,
      headers: {
        'X-Entity-Ref-ID': idempotencyKey,
      },
    });

    if (res.data?.id) {
      notificationRecord.status = 'SENT';
      notificationRecord.providerMessageId = res.data.id;
    } else if (res.error) {
      notificationRecord.status = 'FAILED';
      notificationRecord.error = res.error.message || 'Resend API rejected message';
    }
  } catch (err: any) {
    notificationRecord.status = 'FAILED';
    notificationRecord.error = err.message || 'Unknown network error sending email';
  }

  clinicStore.saveEmailNotification(notificationRecord);
  return notificationRecord;
}
