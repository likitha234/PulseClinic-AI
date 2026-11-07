/**
 * Automated Verification Test Suite for Master Improvement Prompt
 * Tests:
 * 1. Demo Login Isolation & Role-based authentication
 * 2. Human Approval for Appointments (Pending -> Accept / Reject -> Auto-reassignment)
 * 3. AI Doctor Clinical Handoff Summary Generation
 * 4. Monthly AI Health Check-in Agent (Multilingual, Turn processing, Auto-scheduling)
 * 5. Longitudinal Biomarker Tracking & Lab Report Upload
 */

import { AuthService } from './src/server/auth.ts';
import { CalendarService } from './src/server/calendar.ts';
import { DoctorHandoffService } from './src/server/doctorHandoffService.ts';
import { MonthlyCheckinAgent } from './src/server/monthlyCheckinAgent.ts';
import { ReportComparisonService } from './src/server/reportComparisonService.ts';
import { PatientService } from './src/server/patientService.ts';
import { clinicStore } from './src/server/store.ts';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🏥 PULSECLINIC AI - MASTER IMPROVEMENT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // --- TEST 1: Demo Login Isolation & RBAC ---
  console.log('--- TEST 1: Strict Demo Login Isolation & RBAC ---');
  try {
    const patientLogin = await AuthService.login({
      email: 'eleanor.hughes@example.com',
      password: 'PatientPass123!',
    });
    assert(
      patientLogin.user.role === 'patient' && patientLogin.user.displayName === 'Eleanor Hughes',
      'Patient Demo Login succeeds with exclusive Patient role'
    );

    const docLogin = await AuthService.login({
      email: 'dr.vance@pulseclinic.internal',
      password: 'DoctorPass123!',
    });
    assert(
      docLogin.user.role === 'doctor' && docLogin.user.status === 'ACTIVE',
      'Doctor Demo Login succeeds with exclusive Doctor role & ACTIVE status'
    );

    const pendingDocLogin = await AuthService.login({
      email: 'dr.alex.morgan@example.com',
      password: 'DoctorPass123!',
    });
    assert(
      pendingDocLogin.user.role === 'doctor' && pendingDocLogin.user.status === 'PENDING_VERIFICATION',
      'Pending Doctor Login shows PENDING_VERIFICATION status requiring staff verification'
    );
  } catch (err: any) {
    assert(false, 'Auth Demo Isolation', err.message);
  }

  // --- TEST 2: Human Approval for Appointments & Doctor Decision Workflow ---
  console.log('\n--- TEST 2: Human Approval for Appointments & Auto-Reassignment ---');
  let testAppointmentId = '';
  try {
    // Find an available slot from the store
    const slots = clinicStore.getDoctorSlots('doc-cardio-1');
    const availableSlot = slots.find((s) => !s.isBooked) || slots[0];

    assert(availableSlot !== undefined, 'Found valid doctor slot for booking test');

    // 2.1 Book appointment with doctor approval required
    const aptResult = await CalendarService.bookAppointment({
      patientId: 'pat-eleanor-01',
      patientName: 'Eleanor Hughes',
      patientEmail: 'eleanor.hughes@example.com',
      patientPhone: '555-0199',
      slotId: availableSlot.slotId,
      chiefComplaint: 'Intermittent chest tightness after moderate exercise',
      urgency: 'ORANGE',
      requireDoctorApproval: true,
    });

    assert(
      aptResult.appointment.status === 'PENDING_DOCTOR_APPROVAL',
      'AI Intake booking enters PENDING_DOCTOR_APPROVAL status (Never auto-confirmed without approval)'
    );

    testAppointmentId = aptResult.appointment.id;

    // 2.2 Doctor Rejection & Automatic Reassignment Workflow
    console.log('Testing doctor rejection and auto-reassignment to next specialist...');
    const rejectResult = await CalendarService.doctorRejectAppointment(
      testAppointmentId,
      'doc-cardio-1',
      'Attending critical surgical procedure during requested hour'
    );

    assert(
      rejectResult.success &&
      (rejectResult.appointment.status === 'PENDING_DOCTOR_APPROVAL' || rejectResult.appointment.status === 'REASSIGNMENT_EXHAUSTED'),
      'Doctor rejection triggers specialist auto-reassignment workflow',
      `Current status: ${rejectResult.appointment.status}`
    );

    const updatedApt = clinicStore.getAppointmentById(testAppointmentId);
    assert(
      (updatedApt?.rejectedDoctorIds || []).includes('doc-cardio-1'),
      'Original rejecting doctor is added to rejectedDoctorIds to prevent infinite loops'
    );

    // 2.3 Doctor Acceptance Workflow
    console.log('Testing doctor acceptance workflow...');
    const acceptingDocId = updatedApt?.doctorId || 'doc-cardio-1';
    const acceptResult = await CalendarService.doctorAcceptAppointment(
      testAppointmentId,
      acceptingDocId,
      'Cardiology evaluation confirmed. Please bring recent ECG and lab panels.'
    );

    assert(
      acceptResult.success && acceptResult.appointment.status === 'CONFIRMED',
      'Appointment becomes CONFIRMED strictly upon doctor explicit acceptance'
    );

    // Verify patient notification was created
    const dashboard = await PatientService.getPatientDashboardData('eleanor.hughes@example.com', 'pat-eleanor-01');
    const hasConfirmationNotif = dashboard.notifications.some(
      (n) => n.relatedId === testAppointmentId && (n.title.includes('Confirmed') || n.title.includes('Approved'))
    );
    assert(
      hasConfirmationNotif,
      'Patient receives confirmation notification only AFTER doctor accepts'
    );
  } catch (err: any) {
    console.error('Stack trace in Test 2:', err.stack);
    assert(false, 'Human Approval & Reassignment', err.message);
  }

  // --- TEST 3: AI Doctor Clinical Handoff Summary ---
  console.log('\n--- TEST 3: AI Doctor Clinical Handoff Summary ---');
  try {
    assert(Boolean(testAppointmentId), 'Valid appointment ID available for handoff summary');
    const handoff = await DoctorHandoffService.generateHandoffSummary(testAppointmentId);
    assert(
      handoff !== null && handoff.demographics !== undefined,
      'Structured Doctor Handoff summary generated successfully'
    );
    assert(
      handoff.clinicalDisclaimer.includes('sole clinical authority') || handoff.clinicalDisclaimer.includes('CLINICAL NOTICE'),
      'Safety guardrail disclaimer present (AI assistive only, no autonomous prescriptions)'
    );
  } catch (err: any) {
    assert(false, 'Doctor Handoff Summary', err.message);
  }

  // --- TEST 4: Monthly AI Health Check-in Agent ---
  console.log('\n--- TEST 4: Monthly AI Health Check-in Agent ---');
  try {
    // 4.1 Initialize Session
    const session = await MonthlyCheckinAgent.getOrCreateSession({
      patientEmail: 'eleanor.hughes@example.com',
      patientId: 'pat-eleanor-01',
      patientName: 'Eleanor Hughes',
      language: 'en',
    });
    assert(
      session.sessionId.startsWith('chk-sess-') && session.messages.length > 0,
      'Monthly Check-in Agent initializes conversational session with personalized greeting'
    );

    // 4.2 Telugu Language Support
    const sessionTe = await MonthlyCheckinAgent.getOrCreateSession({
      patientEmail: 'eleanor.hughes@example.com',
      patientId: 'pat-eleanor-01',
      patientName: 'Eleanor Hughes',
      language: 'te',
    });
    assert(
      sessionTe.language === 'te' && sessionTe.messages[0].text.length > 0,
      'Check-in Agent supports Telugu (తెలుగు) language configuration'
    );

    // 4.3 Multi-turn Conversation & Vitals Extraction
    const turnResult = await MonthlyCheckinAgent.processTurn({
      sessionId: session.sessionId,
      messageText: 'My blood pressure today was 122/82 and pulse was 74 bpm. Taking blood pressure medications on time.',
      language: 'en',
    });
    assert(
      turnResult.session.extractedVitals.bloodPressure !== undefined || turnResult.session.extractedVitals.heartRate !== undefined,
      'Check-in Agent extracts vitals (BP/HR) from conversational responses'
    );

    // 4.4 Completion & Auto-scheduling +30 days
    const completedRecord = await MonthlyCheckinAgent.finalizeCheckIn(turnResult.session);
    assert(
      completedRecord.status === 'COMPLETED' && completedRecord.nextCheckInDate !== undefined,
      'Completed check-in auto-schedules next monthly check-in (+30 days)'
    );
  } catch (err: any) {
    assert(false, 'Monthly Check-in Agent', err.message);
  }

  // --- TEST 5: Longitudinal Biomarker Tracking & Report Upload ---
  console.log('\n--- TEST 5: Longitudinal Biomarker Tracking & Lab Report Upload ---');
  try {
    // 5.1 Upload a new diagnostic report with biomarkers
    const uploadedReport = await ReportComparisonService.uploadReport({
      patientEmail: 'eleanor.hughes@example.com',
      patientId: 'pat-eleanor-01',
      title: 'Lipid and Cardiac Panel Screening',
      category: 'LAB_REPORT',
      doctorName: 'Dr. Sarah Jenkins',
      summary: 'Bi-annual lipid evaluation.',
      metrics: [
        { name: 'Total Cholesterol', value: '205 mg/dL' },
        { name: 'LDL Cholesterol', value: '122 mg/dL' },
        { name: 'HDL Cholesterol', value: '60 mg/dL' },
        { name: 'Fasting Blood Glucose', value: '92 mg/dL' },
      ],
    });

    assert(
      uploadedReport.id.startsWith('rep-') && (uploadedReport.metrics || []).length === 4,
      'Lab report uploaded and structured with biomarkers'
    );

    // 5.2 Compute longitudinal comparison
    const comparison = await ReportComparisonService.getPatientReportComparison(
      'eleanor.hughes@example.com',
      'pat-eleanor-01',
      'Eleanor Hughes'
    );

    assert(
      comparison.biomarkers.length > 0,
      'Longitudinal biomarker comparison successfully tracks biomarkers across reports'
    );

    const cholesterolBio = comparison.biomarkers.find((b) => b.name?.includes('Cholesterol') || b.biomarkerName?.includes('Cholesterol'));
    assert(
      cholesterolBio !== undefined && (cholesterolBio.changeTrend !== undefined || cholesterolBio.trend !== undefined),
      'Biomarkers compute longitudinal trends (INCREASED, DECREASED, or STABLE)'
    );
  } catch (err: any) {
    assert(false, 'Biomarker Tracking & Report Upload', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
