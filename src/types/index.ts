/**
 * PulseClinic AI - Healthcare Domain Types & Data Models
 * Enterprise Patient Intake, Triage & Autonomous Scheduling Engine
 */

export type UserRole = 'patient' | 'staff' | 'admin' | 'doctor';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  isReturning: boolean;
  medicalHistory: {
    chronicConditions: string[];
    allergies: string[];
    currentMedications: string[];
    surgeries: string[];
    previousVisitsCount: number;
    lastVisitDate?: string;
  };
  consentGiven: boolean;
  consentTimestamp?: string;
  createdAt: string;
  updatedAt: string;
}

export type TriageUrgency = 'RED' | 'ORANGE' | 'GREEN';

export interface RedFlagDetection {
  triggered: boolean;
  category: 'breathing' | 'chest_pain' | 'unconsciousness' | 'stroke' | 'severe_bleeding' | 'anaphylaxis' | 'none';
  detectedSymptoms: string[];
  rationale: string;
}

export interface TriageAssessment {
  id: string;
  patientId: string;
  timestamp: string;
  urgency: TriageUrgency;
  primaryComplaint: string;
  symptoms: string[];
  duration: string;
  severity: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onset: string;
  associatedSymptoms: string[];
  redFlagAnalysis: RedFlagDetection;
  recommendedSpecialty: DoctorSpecialty;
  clinicalRationale: string;
  actionRequired: 'EMERGENCY_ESCALATION' | 'URGENT_CLINICAL_REVIEW' | 'ROUTINE_SPECIALIST_BOOKING';
  escalatedToStaff: boolean;
  escalationAcknowledgedBy?: string;
  staffNotes?: string;
}

export type DoctorSpecialty =
  | 'General Physician'
  | 'Cardiologist'
  | 'Dermatologist'
  | 'Orthopedic'
  | 'Pediatrician'
  | 'Neurologist';

export interface Doctor {
  id: string;
  name: string;
  title: string;
  specialty: DoctorSpecialty;
  qualifications: string;
  bio: string;
  roomNumber: string;
  avatarUrl: string;
  availableDays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
  workingHours: {
    start: string; // e.g. "09:00"
    end: string;   // e.g. "17:00"
  };
  slotDurationMinutes: number;
  isAvailableToday: boolean;
  status: 'ACTIVE' | 'ON_LEAVE' | 'EMERGENCY_DUTY';
}

export interface DoctorSlot {
  slotId: string;
  doctorId: string;
  doctorName: string;
  specialty: DoctorSpecialty;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isBooked: boolean;
  lockedBySessionId?: string;
}

export type AppointmentStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REBOOKED'
  | 'PENDING_APPROVAL'
  | 'COMPLETED';

export interface Appointment {
  id: string;
  bookingId: string; // e.g. BK-982341
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: DoctorSpecialty;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  clinicName: string;
  clinicAddress: string;
  status: AppointmentStatus;
  urgency: TriageUrgency;
  chiefComplaint: string;
  rescheduledFromBookingId?: string;
  cancellationReason?: string;
  rebookingNotes?: string;
  patientAuthorizedRebooking?: boolean;
  emailNotificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RebookingRequest {
  id: string;
  originalAppointmentId: string;
  originalBookingId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  cancelledDoctorId: string;
  cancelledDoctorName: string;
  specialty: DoctorSpecialty;
  cancellationReason: string;
  status: 'PROPOSED' | 'AUTO_REBOOKED' | 'PATIENT_APPROVAL_REQUIRED' | 'REBOOKING_FAILED';
  proposedSlot?: {
    doctorId: string;
    doctorName: string;
    date: string;
    time: string;
  };
  newAppointmentId?: string;
  newBookingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HumanApproval {
  id: string;
  patientId: string;
  patientName: string;
  type: 'URGENT_CASE_REVIEW' | 'AMBIGUOUS_TRIAGE' | 'EXCEPTIONAL_ROUTING' | 'REBOOKING_OVERRIDE';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
  details: string;
  symptoms: string[];
  proposedAction: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface EmailNotification {
  id: string;
  appointmentId: string;
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type: 'BOOKING_CONFIRMATION' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_CANCELLED' | 'EMERGENCY_STAFF_ALERT';
  status: 'SENT' | 'PENDING' | 'FAILED' | 'NOT_CONNECTED';
  providerMessageId?: string;
  error?: string;
  idempotencyKey: string;
  sentAt: string;
  retryCount: number;
}

export interface BrowserbaseSessionInfo {
  sessionId: string;
  status: 'RUNNING' | 'COMPLETED' | 'ERROR' | 'NOT_CONNECTED';
  url: string;
  doctorName?: string;
  observations: string;
  liveDebugUrl?: string;
  createdAt: string;
  error?: string;
}

export interface AgentExecutionStep {
  stepNumber: number;
  stage: 'PLAN' | 'ACT' | 'OBSERVE' | 'RE-PLAN' | 'VERIFY';
  description: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
  };
  toolResult?: {
    success: boolean;
    data: any;
    error?: string;
  };
  observationNotes?: string;
  replanningDecision?: string;
  timestamp: string;
}

export interface AgentExecutionLog {
  id: string;
  sessionId: string;
  patientId?: string;
  userPrompt: string;
  overallStatus: 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED_EMERGENCY' | 'FAILED';
  steps: AgentExecutionStep[];
  startedAt: string;
  completedAt?: string;
}

export interface EvaluationTestCase {
  id: string; // e.g. TC01
  title: string;
  scenario: string;
  patientProfile: {
    fullName: string;
    isReturning: boolean;
    complaint: string;
    symptoms: string[];
    requestMedication?: boolean;
    requestedSpecialty?: string;
    simulatedCalendarFailure?: boolean;
    simulatedDoctorCancellation?: boolean;
    simulatedFullyBooked?: boolean;
  };
  expectedUrgency: TriageUrgency | 'REFUSAL';
  expectedSpecialty?: DoctorSpecialty;
  expectedOutcome: string;
  safetyCheck: string;
}

export interface EvaluationResult {
  testId: string;
  testTitle: string;
  passed: boolean;
  actualUrgency?: string;
  actualSpecialty?: string;
  actualOutcome: string;
  safetyCompliant: boolean;
  executionTrace: string[];
  executionTimeMs: number;
  error?: string;
}

export interface EvaluationMetricSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  triageAccuracyPct: number;
  redFlagDetectionPct: number;
  bookingSuccessPct: number;
  emailNotificationSuccessPct: number;
  safetyCompliancePct: number;
  executedAt: string;
  results: EvaluationResult[];
}

export interface SystemIntegrationsStatus {
  gemini: {
    connected: boolean;
    model: string;
    status: 'ACTIVE' | 'NOT_CONNECTED';
  };
  browserbase: {
    connected: boolean;
    projectId?: string;
    status: 'ACTIVE' | 'NOT_CONNECTED';
    info: string;
  };
  resend: {
    connected: boolean;
    status: 'ACTIVE' | 'NOT_CONNECTED';
    info: string;
  };
  firebase: {
    connected: boolean;
    projectId: string;
    status: 'ACTIVE' | 'LOCAL_PERSISTENCE';
    info: string;
  };
  calendar: {
    connected: boolean;
    status: 'ACTIVE';
    totalDoctors: number;
  };
}

export type CsvTargetCollection =
  | 'patients'
  | 'medical_history'
  | 'doctors'
  | 'doctor_availability'
  | 'appointments'
  | 'triage_test_data'
  | 'evaluation_test_cases';

export interface CsvRowError {
  row: number;
  identifier?: string;
  reason: string;
}

export interface CsvImportFileResult {
  fileName: string;
  targetCollection: CsvTargetCollection;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: CsvRowError[];
  sampleImportedIds: string[];
  isSynthetic: boolean;
}

export interface CsvImportSummary {
  success: boolean;
  timestamp: string;
  filesProcessed: number;
  totalRecords: number;
  totalImported: number;
  totalSkipped: number;
  totalFailed: number;
  fileResults: CsvImportFileResult[];
  firestoreVerified: boolean;
  firestoreStats?: Record<string, { count: number; sampleIds: string[] }>;
}

export interface CsvTestSuiteResult {
  title: string;
  passed: boolean;
  details: string;
  error?: string;
}

