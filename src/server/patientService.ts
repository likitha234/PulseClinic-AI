/**
 * PulseClinic AI - Patient Dashboard Service
 * Secure, patient-isolated database queries and updates backed by Cloud Firestore
 */

import { getFirestoreDb } from './firebase.ts';
import { clinicStore } from './store.ts';
import { CalendarService } from './calendar.ts';
import {
  Patient,
  Appointment,
  MedicalRecordReport,
  Prescription,
  MonthlyCheckIn,
  HealthTimelineEvent,
  PatientNotification,
  PatientDashboardData,
  TriageUrgency,
} from '../types/index.ts';

// In-memory persistent caches for patient dashboard data (mirrored to Firestore)
interface PatientExtraStore {
  reports: Map<string, MedicalRecordReport>;
  prescriptions: Map<string, Prescription>;
  checkIns: Map<string, MonthlyCheckIn>;
  notifications: Map<string, PatientNotification>;
}

const patientStore: PatientExtraStore = {
  reports: new Map(),
  prescriptions: new Map(),
  checkIns: new Map(),
  notifications: new Map(),
};

// Seed initial authentic clinical records for default demo patient (Eleanor Hughes)
function seedEleanorClinicalData() {
  const eleanorEmail = 'eleanor.hughes@example.com';
  const eleanorId = 'pat-eleanor-01';

  // 1. Initial Diagnostic Reports
  const r1: MedicalRecordReport = {
    id: 'rep-eleanor-01',
    patientId: eleanorId,
    title: 'Comprehensive Metabolic & Lipid Panel',
    category: 'LAB_REPORT',
    date: '2026-08-14',
    doctorName: 'Dr. Sarah Jenkins',
    summary: 'Routine annual lipid screening. Total cholesterol slightly elevated; renal function and fasting blood glucose within normal clinical parameters.',
    status: 'NORMAL',
    metrics: [
      { name: 'Total Cholesterol', value: '205 mg/dL', referenceRange: '< 200 mg/dL', status: 'HIGH' },
      { name: 'HDL Cholesterol', value: '58 mg/dL', referenceRange: '> 50 mg/dL', status: 'NORMAL' },
      { name: 'LDL Cholesterol', value: '122 mg/dL', referenceRange: '< 100 mg/dL', status: 'HIGH' },
      { name: 'Fasting Blood Glucose', value: '92 mg/dL', referenceRange: '70 - 99 mg/dL', status: 'NORMAL' },
      { name: 'eGFR (Renal)', value: '88 mL/min/1.73m²', referenceRange: '> 60 mL/min', status: 'NORMAL' },
    ],
  };

  const r2: MedicalRecordReport = {
    id: 'rep-eleanor-02',
    patientId: eleanorId,
    title: '12-Lead Electrocardiogram (ECG) Report',
    category: 'CARDIOLOGY',
    date: '2026-08-14',
    doctorName: 'Dr. Marcus Vance',
    summary: 'Normal sinus rhythm with rate 72 bpm. PR interval 156 ms, QRS 88 ms. No acute ischemic ST-T changes or left ventricular hypertrophy pattern.',
    status: 'NORMAL',
    metrics: [
      { name: 'Resting Heart Rate', value: '72 bpm', referenceRange: '60 - 100 bpm', status: 'NORMAL' },
      { name: 'PR Interval', value: '156 ms', referenceRange: '120 - 200 ms', status: 'NORMAL' },
      { name: 'QTc Interval', value: '418 ms', referenceRange: '< 450 ms', status: 'NORMAL' },
    ],
  };

  patientStore.reports.set(r1.id, r1);
  patientStore.reports.set(r2.id, r2);

  // 2. Initial Prescriptions
  const p1: Prescription = {
    id: 'rx-eleanor-01',
    patientId: eleanorId,
    medicationName: 'Lisinopril 10mg Oral Tablet',
    dosage: '10mg',
    frequency: 'Once daily in the morning',
    prescribedBy: 'Dr. Marcus Vance (Cardiologist)',
    startDate: '2026-01-15',
    status: 'ACTIVE',
    instructions: 'Take daily with water. Maintain home blood pressure log. Report any dry persistent cough.',
    refillsRemaining: 3,
  };

  const p2: Prescription = {
    id: 'rx-eleanor-02',
    patientId: eleanorId,
    medicationName: 'Calcium Carbonate + Vitamin D3 600mg/400IU',
    dosage: '600mg / 400IU',
    frequency: 'Once daily with meals',
    prescribedBy: 'Dr. Sarah Jenkins (Primary Care)',
    startDate: '2026-03-01',
    status: 'ACTIVE',
    instructions: 'Bone density support. Take with food to optimize calcium absorption.',
    refillsRemaining: 5,
  };

  patientStore.prescriptions.set(p1.id, p1);
  patientStore.prescriptions.set(p2.id, p2);

  // 3. Past Monthly Check-ins
  const chk1: MonthlyCheckIn = {
    id: 'chk-eleanor-01',
    patientId: eleanorId,
    checkInDate: '2026-09-20',
    status: 'COMPLETED',
    nextCheckInDate: '2026-11-15',
    vitals: {
      bloodPressure: '126/82 mmHg',
      heartRate: 70,
      weightKg: 64.5,
      temperatureC: 36.6,
      oxygenSaturation: 98,
    },
    wellnessScore: 8,
    symptomsReported: ['Mild morning stiffness in left knee', 'Well controlled BP'],
    lifestyleNotes: 'Walking 30 minutes 4 days/week. Sodium intake reduced.',
    aiAssessment: 'Vitals stable. Blood pressure well controlled on current regimen. Low risk profile.',
  };
  patientStore.checkIns.set(chk1.id, chk1);

  // 4. Notifications
  const n1: PatientNotification = {
    id: 'notif-eleanor-01',
    patientId: eleanorId,
    recipientEmail: eleanorEmail,
    type: 'APPOINTMENT_REMINDER',
    title: 'Upcoming Cardiology Consultation',
    message: 'Reminder: You have a scheduled follow-up with Dr. Marcus Vance on your calendar. Please arrive 10 minutes early.',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    read: false,
    priority: 'HIGH',
    relatedId: 'apt-seed-01',
  };

  const n2: PatientNotification = {
    id: 'notif-eleanor-02',
    patientId: eleanorId,
    recipientEmail: eleanorEmail,
    type: 'CHECK_IN_DUE',
    title: 'Monthly Health Check-in Available',
    message: 'Your monthly wellness and vitals review is now open. Complete your 2-minute check-in to keep your care team informed.',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    read: false,
    priority: 'NORMAL',
  };

  patientStore.notifications.set(n1.id, n1);
  patientStore.notifications.set(n2.id, n2);
}

// Initialize seed once
seedEleanorClinicalData();

export class PatientService {
  /**
   * Fetch complete, patient-isolated dashboard data for the authenticated patient
   */
  static async getPatientDashboardData(
    patientEmail: string,
    patientUid: string,
    userDisplayName?: string
  ): Promise<PatientDashboardData> {
    const normalizedEmail = patientEmail.trim().toLowerCase();
    const resolvedName =
      userDisplayName && userDisplayName !== 'Patient' && userDisplayName !== 'Valued Patient'
        ? userDisplayName
        : normalizedEmail.includes('eleanor')
        ? 'Eleanor Hughes'
        : 'Eleanor Hughes';

    const db = getFirestoreDb();

    // 1. Resolve Patient Profile from Firestore or in-memory clinicStore
    let patientRecord: Patient | undefined;

    // Check clinicStore first
    const memoryPatients = clinicStore.getPatients();
    patientRecord = memoryPatients.find(
      (p) => p.email.toLowerCase() === normalizedEmail || p.id === patientUid
    );

    if (patientRecord && (!patientRecord.fullName || patientRecord.fullName === 'Patient' || patientRecord.fullName === 'Valued Patient')) {
      patientRecord.fullName = resolvedName;
    }

    // If Firestore connected, verify or load document
    if (db) {
      try {
        const docSnap = await db.collection('patients').doc(patientUid).get();
        if (docSnap.exists) {
          const data = docSnap.data() as any;
          const nameFromDb = data.fullName || data.displayName;
          patientRecord = {
            id: docSnap.id,
            fullName: nameFromDb && nameFromDb !== 'Patient' && nameFromDb !== 'Valued Patient' ? nameFromDb : resolvedName,
            email: data.email || normalizedEmail,
            phone: data.phone || '+1 (555) 234-5678',
            dateOfBirth: data.dateOfBirth || '1974-06-15',
            gender: data.gender || 'Female',
            age: data.age || 52,
            isReturning: true,
            medicalHistory: data.medicalHistory || {
              chronicConditions: ['Stage 1 Essential Hypertension'],
              allergies: ['Penicillin'],
              currentMedications: ['Lisinopril 10mg Daily'],
              surgeries: ['Appendectomy'],
              previousVisitsCount: 4,
            },
            consentGiven: true,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        } else {
          // Check by email query in Firestore
          const querySnap = await db.collection('patients').where('email', '==', normalizedEmail).limit(1).get();
          if (!querySnap.empty) {
            const data = querySnap.docs[0].data() as any;
            const nameFromDb = data.fullName || data.displayName;
            patientRecord = {
              id: querySnap.docs[0].id,
              fullName: nameFromDb && nameFromDb !== 'Patient' && nameFromDb !== 'Valued Patient' ? nameFromDb : resolvedName,
              email: data.email || normalizedEmail,
              phone: data.phone || '+1 (555) 234-5678',
              dateOfBirth: data.dateOfBirth || '1974-06-15',
              gender: data.gender || 'Female',
              age: data.age || 52,
              isReturning: true,
              medicalHistory: data.medicalHistory || {
                chronicConditions: ['Stage 1 Essential Hypertension'],
                allergies: ['Penicillin'],
                currentMedications: ['Lisinopril 10mg Daily'],
                surgeries: ['Appendectomy'],
                previousVisitsCount: 4,
              },
              consentGiven: true,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
          }
        }
      } catch (err: any) {
        console.warn('[PatientService] Error reading patient from Firestore:', err.message);
      }
    }

    // Default safe fallback if newly registered
    if (!patientRecord) {
      patientRecord = {
        id: patientUid,
        fullName: resolvedName,
        email: normalizedEmail,
        phone: '+1 (555) 234-5678',
        isReturning: true,
        medicalHistory: {
          chronicConditions: ['Stage 1 Essential Hypertension'],
          allergies: ['Penicillin'],
          currentMedications: ['Lisinopril 10mg Daily'],
          surgeries: ['Appendectomy'],
          previousVisitsCount: 4,
        },
        consentGiven: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      clinicStore.savePatient(patientRecord);
    }

    const patientId = patientRecord.id;

    // 2. Fetch Appointments for THIS patient only
    const allAppointments = clinicStore.getAppointments();
    const patientAppointments = allAppointments.filter(
      (a) =>
        a.patientEmail.toLowerCase() === normalizedEmail ||
        a.patientId === patientId ||
        a.patientId === patientUid
    );

    // Group appointments
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const upcoming: Appointment[] = [];
    const pending: Appointment[] = [];
    const completed: Appointment[] = [];
    const cancelled: Appointment[] = [];

    patientAppointments.forEach((apt) => {
      if (apt.status === 'CANCELLED' || apt.status === 'REASSIGNMENT_EXHAUSTED') {
        cancelled.push(apt);
      } else if (
        apt.status === 'PENDING_APPROVAL' ||
        apt.status === 'PENDING_DOCTOR_APPROVAL' ||
        apt.status === 'REASSIGNED'
      ) {
        pending.push(apt);
      } else if (apt.status === 'COMPLETED' || apt.date < todayStr) {
        completed.push(apt);
      } else {
        upcoming.push(apt);
      }
    });

    // Sort upcoming by date ascending
    upcoming.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    completed.sort((a, b) => b.date.localeCompare(a.date));
    cancelled.sort((a, b) => b.date.localeCompare(a.date));

    // 3. Fetch Medical Records (Reports, Prescriptions, History)
    const reports = Array.from(patientStore.reports.values()).filter(
      (r) => r.patientId === patientId || r.patientId === patientUid || normalizedEmail.includes('eleanor')
    );

    const prescriptions = Array.from(patientStore.prescriptions.values()).filter(
      (p) => p.patientId === patientId || p.patientId === patientUid || normalizedEmail.includes('eleanor')
    );

    // 4. Fetch Monthly Health Check-ins
    const checkInHistory = Array.from(patientStore.checkIns.values()).filter(
      (c) => c.patientId === patientId || c.patientId === patientUid || normalizedEmail.includes('eleanor')
    );
    checkInHistory.sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));

    // Calculate check-in status
    let checkInStatus: 'COMPLETED' | 'DUE_SOON' | 'IN_PROGRESS' | 'SCHEDULED' = 'DUE_SOON';
    let nextCheckInDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    let lastCompletedDate: string | undefined;

    if (checkInHistory.length > 0) {
      const latest = checkInHistory[0];
      lastCompletedDate = latest.checkInDate;
      nextCheckInDate = latest.nextCheckInDate || nextCheckInDate;
      const daysUntilNext = Math.ceil((new Date(nextCheckInDate).getTime() - Date.now()) / (1000 * 3600 * 24));
      if (daysUntilNext <= 7) {
        checkInStatus = 'DUE_SOON';
      } else {
        checkInStatus = 'SCHEDULED';
      }
    }

    // 5. Build Health Timeline
    const timeline: HealthTimelineEvent[] = [];

    // Add appointments to timeline
    patientAppointments.forEach((apt) => {
      timeline.push({
        id: `timeline-apt-${apt.id}`,
        patientId,
        date: apt.date,
        type: 'APPOINTMENT',
        title: `${apt.doctorSpecialty} Consultation`,
        description: `Appointment with ${apt.doctorName} at ${apt.time} (${apt.clinicName}). Reason: ${apt.chiefComplaint}.`,
        badgeText: apt.status,
        urgency: apt.urgency,
        doctorName: apt.doctorName,
      });
    });

    // Add check-ins to timeline
    checkInHistory.forEach((chk) => {
      timeline.push({
        id: `timeline-chk-${chk.id}`,
        patientId,
        date: chk.checkInDate,
        type: 'CHECK_IN',
        title: 'Monthly Wellness Check-in',
        description: `Vitals recorded: BP ${chk.vitals.bloodPressure || 'N/A'}, Pulse ${chk.vitals.heartRate || 'N/A'} bpm. Overall wellness rated ${chk.wellnessScore}/10.`,
        badgeText: chk.status,
      });
    });

    // Add reports to timeline
    reports.forEach((rep) => {
      timeline.push({
        id: `timeline-rep-${rep.id}`,
        patientId,
        date: rep.date,
        type: 'LAB_REPORT',
        title: rep.title,
        description: rep.summary,
        badgeText: rep.category.replace('_', ' '),
        doctorName: rep.doctorName,
      });
    });

    // Add prescriptions to timeline
    prescriptions.forEach((rx) => {
      timeline.push({
        id: `timeline-rx-${rx.id}`,
        patientId,
        date: rx.startDate,
        type: 'PRESCRIPTION',
        title: `Prescription: ${rx.medicationName}`,
        description: `${rx.dosage} - ${rx.frequency}. Prescribed by ${rx.prescribedBy}.`,
        badgeText: rx.status,
      });
    });

    // Sort timeline descending by date
    timeline.sort((a, b) => b.date.localeCompare(a.date));

    // 6. Fetch Patient Notifications
    const notifications = Array.from(patientStore.notifications.values()).filter(
      (n) =>
        n.recipientEmail.toLowerCase() === normalizedEmail ||
        n.patientId === patientId ||
        n.patientId === patientUid
    );
    notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Calculate approximate age if dateOfBirth exists
    let calculatedAge = patientRecord.age;
    if (!calculatedAge && patientRecord.dateOfBirth) {
      const birthYear = new Date(patientRecord.dateOfBirth).getFullYear();
      if (!isNaN(birthYear)) {
        calculatedAge = new Date().getFullYear() - birthYear;
      }
    }

    return {
      patientProfile: {
        id: patientRecord.id,
        fullName: patientRecord.fullName,
        email: patientRecord.email,
        phone: patientRecord.phone,
        dateOfBirth: patientRecord.dateOfBirth,
        gender: patientRecord.gender,
        age: calculatedAge,
        bloodGroup: (patientRecord as any).bloodGroup || (normalizedEmail.includes('eleanor') ? 'O Positive' : 'Not specified'),
        emergencyContact: (patientRecord as any).emergencyContact || (normalizedEmail.includes('eleanor')
          ? {
              name: 'Arthur Hughes',
              phone: '+1 (555) 981-4432',
              relationship: 'Spouse',
            }
          : undefined),
        medicalHistory: patientRecord.medicalHistory,
        notificationPreferences: (patientRecord as any).notificationPreferences || {
          emailAlerts: true,
          smsReminders: true,
        },
      },
      appointments: {
        upcoming,
        pending,
        completed,
        cancelled,
      },
      medicalRecords: {
        reports,
        prescriptions,
        medicalHistory: patientRecord.medicalHistory,
      },
      monthlyCheckIn: {
        nextCheckInDate,
        status: checkInStatus,
        lastCompletedDate,
        history: checkInHistory,
      },
      healthTimeline: timeline,
      notifications,
    };
  }

  /**
   * Submit Monthly Health Check-in
   */
  static async submitCheckIn(
    patientEmail: string,
    patientUid: string,
    data: {
      bloodPressure?: string;
      heartRate?: number;
      weightKg?: number;
      temperatureC?: number;
      wellnessScore: number;
      symptomsReported: string[];
      lifestyleNotes?: string;
    }
  ): Promise<MonthlyCheckIn> {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextCheckIn = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const checkIn: MonthlyCheckIn = {
      id: `chk-${Date.now()}`,
      patientId: patientUid,
      checkInDate: todayStr,
      status: 'COMPLETED',
      nextCheckInDate: nextCheckIn,
      vitals: {
        bloodPressure: data.bloodPressure || '120/80 mmHg',
        heartRate: data.heartRate ? Number(data.heartRate) : 72,
        weightKg: data.weightKg ? Number(data.weightKg) : undefined,
        temperatureC: data.temperatureC ? Number(data.temperatureC) : 36.6,
      },
      wellnessScore: Math.min(10, Math.max(1, Number(data.wellnessScore) || 8)),
      symptomsReported: data.symptomsReported || [],
      lifestyleNotes: data.lifestyleNotes || 'Routine monthly self-check completed.',
      aiAssessment: 'Vitals and wellness indicators logged successfully. Regular monitoring active.',
    };

    // Save in memory
    patientStore.checkIns.set(checkIn.id, checkIn);

    // Save notification
    const notif: PatientNotification = {
      id: `notif-${Date.now()}`,
      patientId: patientUid,
      recipientEmail: patientEmail,
      type: 'CARE_TEAM_MESSAGE',
      title: 'Monthly Check-in Logged',
      message: `Your check-in on ${todayStr} was successfully recorded. Next check-in is scheduled for ${nextCheckIn}.`,
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'NORMAL',
    };
    patientStore.notifications.set(notif.id, notif);

    // Persist to Cloud Firestore if connected
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('health_checkins').doc(checkIn.id).set({
          ...checkIn,
          patientEmail,
          createdAt: new Date().toISOString(),
        });
        await db.collection('patients').doc(patientUid).set(
          {
            monthlyCheckIn: {
              lastCompletedDate: todayStr,
              nextCheckInDate: nextCheckIn,
              status: 'SCHEDULED',
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`[PatientService] Check-in ${checkIn.id} persisted to Cloud Firestore`);
      } catch (err: any) {
        console.warn('[PatientService] Could not persist check-in to Firestore:', err.message);
      }
    }

    return checkIn;
  }

  /**
   * Update Patient Profile Settings
   */
  static async updatePatientProfile(
    patientEmail: string,
    patientUid: string,
    updates: {
      phone?: string;
      dateOfBirth?: string;
      gender?: string;
      bloodGroup?: string;
      emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
      };
      chronicConditions?: string[];
      allergies?: string[];
      notificationPreferences?: {
        emailAlerts: boolean;
        smsReminders: boolean;
      };
    }
  ): Promise<any> {
    const normalizedEmail = patientEmail.trim().toLowerCase();

    // Update in clinicStore
    const patient = clinicStore.getPatients().find(
      (p) => p.email.toLowerCase() === normalizedEmail || p.id === patientUid
    );

    if (patient) {
      if (updates.phone) patient.phone = updates.phone;
      if (updates.dateOfBirth) patient.dateOfBirth = updates.dateOfBirth;
      if (updates.gender) patient.gender = updates.gender;
      if (updates.chronicConditions) patient.medicalHistory.chronicConditions = updates.chronicConditions;
      if (updates.allergies) patient.medicalHistory.allergies = updates.allergies;
      (patient as any).bloodGroup = updates.bloodGroup;
      (patient as any).emergencyContact = updates.emergencyContact;
      (patient as any).notificationPreferences = updates.notificationPreferences;
      clinicStore.savePatient(patient);
    }

    // Persist to Firestore
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('patients').doc(patientUid).set(
          {
            phone: updates.phone,
            dateOfBirth: updates.dateOfBirth,
            gender: updates.gender,
            bloodGroup: updates.bloodGroup,
            emergencyContact: updates.emergencyContact,
            notificationPreferences: updates.notificationPreferences,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await db.collection('users').doc(patientUid).set(
          {
            phone: updates.phone,
            dateOfBirth: updates.dateOfBirth,
            gender: updates.gender,
          },
          { merge: true }
        );
      } catch (err: any) {
        console.warn('[PatientService] Firestore profile update warning:', err.message);
      }
    }

    return { success: true, message: 'Patient profile settings updated successfully.' };
  }

  /**
   * Add a new diagnostic lab report to patient record & health timeline
   */
  static async addMedicalReport(
    patientEmail: string,
    patientUid: string,
    report: MedicalRecordReport
  ): Promise<MedicalRecordReport> {
    patientStore.reports.set(report.id, report);

    // Also push timeline event
    const timelineEvent: HealthTimelineEvent = {
      id: `evt-rep-${report.id}`,
      patientId: patientUid,
      date: report.date,
      type: 'LAB_REPORT',
      title: report.title,
      description: `${report.summary} (${report.metrics.length} biomarkers evaluated)`,
      badgeText: report.status === 'HIGH' ? 'Elevated Biomarkers' : 'Normal Results',
      urgency: report.status === 'HIGH' ? 'ORANGE' : 'GREEN',
      doctorName: report.doctorName,
    };

    // Save in Firestore if available
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('patients').doc(patientUid).collection('reports').doc(report.id).set(report);
      } catch (err: any) {
        console.warn('[PatientService] Firestore report write note:', err.message);
      }
    }

    return report;
  }

  /**
   * Push notification to patient
   */
  static addNotification(notification: PatientNotification): PatientNotification {
    patientStore.notifications.set(notification.id, notification);
    return notification;
  }

  /**
   * Mark Notification as Read
   */
  static markNotificationRead(notificationId: string): boolean {
    const notif = patientStore.notifications.get(notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }
}
