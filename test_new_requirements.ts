import { AuthService } from './src/server/auth.ts';
import { CalendarService } from './src/server/calendar.ts';
import { clinicStore } from './src/server/store.ts';
import { matchSpecialist } from './src/server/triage.ts';
import { PatientService } from './src/server/patientService.ts';

async function runVerification() {
  console.log('🚀 Running Comprehensive PulseClinic AI Verification Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    }
  }

  // 1. Patient Demo Logins: Eleanor Hughes and Liam Henderson
  console.log('--- 1. Testing Demo Patient Logins ---');
  const eleanorLogin = await AuthService.login({
    email: 'eleanor.hughes@example.com',
    password: 'PatientPass123!',
    requestedRole: 'patient',
  });
  assert(Boolean(eleanorLogin.user && eleanorLogin.sessionToken && eleanorLogin.user.displayName === 'Eleanor Hughes'), 'Eleanor Hughes authenticates with Patient role');

  const liamLogin = await AuthService.login({
    email: 'liam.henderson@example.com',
    password: 'PatientPass123!',
    requestedRole: 'patient',
  });
  assert(Boolean(liamLogin.user && liamLogin.sessionToken && liamLogin.user.displayName === 'Liam Henderson'), 'Liam Henderson authenticates with Patient role');

  // 2. Doctor Demo Logins: All 6 Doctors
  console.log('\n--- 2. Testing 6 Demo Doctor Logins ---');
  const doctorsToTest = [
    { email: 'dr.marcus.vance@pulseclinic.internal', name: 'Dr. Marcus Vance', spec: 'Cardiology' },
    { email: 'dr.sarah.mitchell@pulseclinic.internal', name: 'Dr. Sarah Mitchell', spec: 'Dermatology' },
    { email: 'dr.james.wilson@pulseclinic.internal', name: 'Dr. James Wilson', spec: 'General Medicine' },
    { email: 'dr.emily.carter@pulseclinic.internal', name: 'Dr. Emily Carter', spec: 'Pediatrics' },
    { email: 'dr.robert.anderson@pulseclinic.internal', name: 'Dr. Robert Anderson', spec: 'Orthopedics' },
    { email: 'dr.sophia.martinez@pulseclinic.internal', name: 'Dr. Sophia Martinez', spec: 'Neurology' },
  ];

  for (const doc of doctorsToTest) {
    const res = await AuthService.login({
      email: doc.email,
      password: 'DoctorPass123!',
      requestedRole: 'doctor',
    });
    assert(Boolean(res.user && res.sessionToken && res.user.displayName === doc.name), `${doc.name} (${doc.spec}) authenticates successfully`);
  }

  // 3. Specialist Matching: Check non-dermatology fallbacks
  console.log('\n--- 3. Testing Specialist Matching & Guardrails ---');
  const coughMatch = matchSpecialist('persistent dry cough and mild fever', ['cough', 'fever', 'fatigue']);
  assert(coughMatch.specialty === 'General Physician', 'Cough/fever routes to General Physician (never default Dermatology)', coughMatch.specialty);

  const chestMatch = matchSpecialist('tightness in chest and palpitations', ['chest tightness', 'racing pulse']);
  assert(chestMatch.specialty === 'Cardiologist', 'Chest tightness routes to Cardiologist', chestMatch.specialty);

  const skinMatch = matchSpecialist('itchy red rash across arms', ['rash', 'eczema', 'itching']);
  assert(skinMatch.specialty === 'Dermatologist', 'Skin rash routes to Dermatologist', skinMatch.specialty);

  const kneeMatch = matchSpecialist('sharp knee pain after running', ['knee pain', 'swelling']);
  assert(kneeMatch.specialty === 'Orthopedic', 'Joint injury routes to Orthopedic', kneeMatch.specialty);

  const childMatch = matchSpecialist('fever and ear pain', ['fever', 'ear pain'], 6);
  assert(childMatch.specialty === 'Pediatrician', 'Child under 18 routes to Pediatrician', childMatch.specialty);

  // 4. Multi-Doctor Approval Chain & Reassignment
  console.log('\n--- 4. Testing Multi-Doctor Approval & Reassignment Flow ---');
  // Get an available slot with Dr. Marcus Vance
  const cardioSlots = clinicStore.getDoctorSlots('doc-cardio-1').filter((s) => !s.isBooked);
  assert(cardioSlots.length > 0, 'Dr. Marcus Vance has open slots');
  const targetSlot = cardioSlots[0];

  // Book appointment with Dr. Marcus Vance
  const bookRes = await CalendarService.bookAppointment({
    patientId: 'pat-1001',
    patientName: 'Eleanor Hughes',
    patientEmail: 'eleanor.hughes@example.com',
    patientPhone: '+1 (555) 234-5678',
    slotId: targetSlot.slotId,
    chiefComplaint: 'Intermittent chest discomfort on exertion',
    urgency: 'ORANGE',
    requireDoctorApproval: true,
  });

  const apt = bookRes.appointment;
  assert(apt.status === 'PENDING_DOCTOR_APPROVAL', 'Initial booking requires doctor review (status PENDING_DOCTOR_APPROVAL)');
  assert(apt.doctorId === 'doc-cardio-1', 'Initial appointment assigned to Dr. Marcus Vance');

  // Concurrency check: Dr. Sarah Mitchell cannot accept/reject Dr. Vance's appointment
  let unauthorizedRejected = false;
  try {
    await CalendarService.doctorAcceptAppointment(apt.id, 'doc-derm-1', 'Unauthorized review attempt');
  } catch (err: any) {
    unauthorizedRejected = err.message.includes('Unauthorized');
  }
  assert(unauthorizedRejected, 'Unauthorized doctor cannot accept an appointment assigned to another doctor');

  // Step 4a: Doctor 1 (Dr. Marcus Vance) Rejects with reason
  const reject1 = await CalendarService.doctorRejectAppointment(
    apt.id,
    'doc-cardio-1',
    'Emergency cardiology surgical case'
  );
  assert(reject1.success && reject1.reassigned, 'Doctor 1 rejection triggers automatic reassignment');
  assert(reject1.appointment.status === 'PENDING_DOCTOR_APPROVAL', 'Reassigned appointment remains PENDING_DOCTOR_APPROVAL');
  assert(reject1.appointment.doctorId !== 'doc-cardio-1', `Appointment reassigned to next doctor: ${reject1.appointment.doctorName}`);
  assert(reject1.appointment.reassignmentHistory?.length === 2, 'Reassignment history records Doctor 1 rejection and next doctor assignment');

  // Step 4b: Next Doctor also rejects
  const currentDocId = reject1.appointment.doctorId;
  const reject2 = await CalendarService.doctorRejectAppointment(
    apt.id,
    currentDocId,
    'Off-clinic consulting engagement'
  );
  assert(reject2.success, 'Doctor 2 rejection processed smoothly');

  // Step 4c: Final Doctor accepts the request
  if (reject2.reassigned) {
    const finalDocId = reject2.appointment.doctorId;
    const acceptRes = await CalendarService.doctorAcceptAppointment(
      apt.id,
      finalDocId,
      'Clinically reviewed and confirmed. Ready for consultation.'
    );
    assert(acceptRes.success && acceptRes.appointment.status === 'CONFIRMED', 'Assigned doctor accepts and confirms appointment');
    const finalHistory = acceptRes.appointment.reassignmentHistory || [];
    assert(finalHistory[finalHistory.length - 1].decision === 'ACCEPTED', 'Reassignment chain records ACCEPTED decision with notes');
  } else {
    assert(reject2.appointment.status === 'AWAITING_STAFF_INTERVENTION', 'Exhausted chain sets status AWAITING_STAFF_INTERVENTION');
  }

  // 5. Test Full Exhaustion -> AWAITING_STAFF_INTERVENTION
  console.log('\n--- 5. Testing Reassignment Exhaustion Escalation ---');
  // Create an appointment in a specialty with only 1 doctor (Neurology has Dr. Sophia Martinez)
  const neuroSlots = clinicStore.getDoctorSlots('doc-neuro-1').filter((s) => !s.isBooked);
  if (neuroSlots.length > 0) {
    const nAptRes = await CalendarService.bookAppointment({
      patientId: 'pat-1002',
      patientName: 'Liam Henderson',
      patientEmail: 'liam.henderson@example.com',
      patientPhone: '+1 (555) 789-0123',
      slotId: neuroSlots[0].slotId,
      chiefComplaint: 'Frequent ocular migraines with aura',
      urgency: 'GREEN',
      requireDoctorApproval: true,
    });

    const neuroApt = nAptRes.appointment;
    // Reject by Dr. Sophia Martinez
    const nRej1 = await CalendarService.doctorRejectAppointment(
      neuroApt.id,
      'doc-neuro-1',
      'Neuro-critical care ward rotation'
    );

    // If rerouted to General Physician fallback, exhaust those too
    let curApt = nRej1.appointment;
    while (curApt.status === 'PENDING_DOCTOR_APPROVAL' && curApt.doctorId) {
      const docToReject = curApt.doctorId;
      const rej = await CalendarService.doctorRejectAppointment(curApt.id, docToReject, 'Physician unavailable');
      curApt = rej.appointment;
    }

    assert(curApt.status === 'AWAITING_STAFF_INTERVENTION', 'Exhausted rejection chain sets status to AWAITING_STAFF_INTERVENTION');
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
