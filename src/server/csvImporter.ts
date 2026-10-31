/**
 * PulseClinic AI - Secure CSV Data Importer & Cloud Firestore Syncer
 * Validates CSV structure, prevents duplicate imports, protects real records,
 * preserves clinical relationships, and writes directly to Cloud Firestore.
 */

import { getFirestoreDb } from './firebase.ts';
import { clinicStore } from './store.ts';
import {
  CsvTargetCollection,
  CsvImportFileResult,
  CsvImportSummary,
  CsvRowError,
  Patient,
  Doctor,
  DoctorSlot,
  Appointment,
  DoctorSpecialty,
  TriageUrgency,
} from '../types/index.ts';

// RFC-4180 compliant CSV parser
export function parseCsvText(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header
  const rawHeaders = splitCsvRow(lines[0]);
  const headers = rawHeaders.map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const rows: Record<string, string>[] = [];

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;

    const values = splitCsvRow(line);
    const rowObj: Record<string, string> = {};

    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] !== undefined ? values[idx].trim() : '';
    });

    rows.push(rowObj);
  }

  return { headers, rows };
}

function splitCsvRow(rowText: string): string[] {
  const result: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    const nextChar = rowText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  result.push(currentVal);
  return result;
}

// Split array fields from semicolon or comma
function parseList(val?: string): string[] {
  if (!val) return [];
  const clean = val.replace(/^\[|\]$/g, '').trim();
  if (!clean) return [];
  // Prefer semicolon, fallback to comma if no semicolon
  const delimiter = clean.includes(';') ? ';' : ',';
  return clean
    .split(delimiter)
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

// Parse boolean
function parseBool(val?: string, defaultVal = false): boolean {
  if (!val) return defaultVal;
  const lower = val.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

// Determine target collection from filename or headers
export function detectTargetCollection(fileName: string, headers: string[]): CsvTargetCollection | null {
  const lower = fileName.toLowerCase();
  if (lower.includes('patient') && !lower.includes('history')) return 'patients';
  if (lower.includes('history') || lower.includes('medical')) return 'medical_history';
  if (lower.includes('doctor') && (lower.includes('avail') || lower.includes('slot'))) return 'doctor_availability';
  if (lower.includes('doctor')) return 'doctors';
  if (lower.includes('appointment') || lower.includes('booking')) return 'appointments';
  if (lower.includes('triage')) return 'triage_test_data';
  if (lower.includes('eval') || lower.includes('test_case')) return 'evaluation_test_cases';

  // Fallback to headers
  const headerStr = headers.map((h) => h.toLowerCase()).join(' ');
  if (headerStr.includes('slotid')) return 'doctor_availability';
  if (headerStr.includes('bookingid')) return 'appointments';
  if (headerStr.includes('chronicconditions') || headerStr.includes('allergies')) return 'medical_history';
  if (headerStr.includes('dateofbirth') || headerStr.includes('isreturning')) return 'patients';
  if (headerStr.includes('specialty') && headerStr.includes('roomnumber')) return 'doctors';
  if (headerStr.includes('expectedurgency') && headerStr.includes('symptoms')) return 'triage_test_data';
  if (headerStr.includes('safetycheck') || headerStr.includes('scenario')) return 'evaluation_test_cases';

  return null;
}

// Required header definitions per collection
const REQUIRED_HEADERS: Record<CsvTargetCollection, string[]> = {
  patients: ['fullName', 'email'],
  medical_history: ['patientId'],
  doctors: ['name', 'specialty'],
  doctor_availability: ['doctorId', 'date', 'startTime'],
  appointments: ['patientName', 'doctorName', 'date', 'time'],
  triage_test_data: ['complaint', 'expectedUrgency'],
  evaluation_test_cases: ['title', 'expectedUrgency'],
};

export async function importCsvFile(
  fileName: string,
  csvContent: string,
  targetCollectionOverride?: CsvTargetCollection
): Promise<CsvImportFileResult> {
  const { headers, rows } = parseCsvText(csvContent);

  const targetCollection =
    targetCollectionOverride || detectTargetCollection(fileName, headers);

  if (!targetCollection) {
    return {
      fileName,
      targetCollection: 'patients',
      totalRows: rows.length,
      importedCount: 0,
      skippedCount: 0,
      failedCount: rows.length,
      errors: [
        {
          row: 0,
          reason: `Could not determine collection for file '${fileName}'. Valid collections: patients, medical_history, doctors, doctor_availability, appointments, triage_test_data, evaluation_test_cases.`,
        },
      ],
      sampleImportedIds: [],
      isSynthetic: true,
    };
  }

  // Validate required headers
  const required = REQUIRED_HEADERS[targetCollection];
  const missingHeaders = required.filter(
    (req) => !headers.some((h) => h.toLowerCase() === req.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    return {
      fileName,
      targetCollection,
      totalRows: rows.length,
      importedCount: 0,
      skippedCount: 0,
      failedCount: rows.length,
      errors: [
        {
          row: 0,
          reason: `Missing required CSV headers for '${targetCollection}': ${missingHeaders.join(', ')}. Present headers: ${headers.join(', ')}`,
        },
      ],
      sampleImportedIds: [],
      isSynthetic: true,
    };
  }

  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Cloud Firestore is not initialized. Please verify server Firebase credentials.');
  }

  const errors: CsvRowError[] = [];
  const sampleImportedIds: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const batchTimestamp = new Date().toISOString();

  // Process rows sequentially to strictly guarantee ID collisions & duplicate skip checks
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2; // 1-indexed, line 1 is header

    try {
      const record = transformRowToEntity(targetCollection, row, idx);
      const docId = record.id || record.slotId;

      if (!docId) {
        errors.push({ row: rowNum, reason: 'Failed to generate a stable ID for row' });
        failedCount++;
        continue;
      }

      // 1. Check if document exists in Firestore
      const docRef = db.collection(targetCollection).doc(docId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const existingData = docSnap.data();
        // Check if existing record is a real patient record
        if (existingData?.isSynthetic === false) {
          skippedCount++;
          errors.push({
            row: rowNum,
            identifier: docId,
            reason: `PROTECTED: Cannot overwrite existing real patient record '${docId}'.`,
          });
          continue;
        }

        // It is an already imported synthetic record -> Skip duplicate
        skippedCount++;
        continue;
      }

      // 2. Mark as synthetic and inject audit metadata
      const documentPayload = {
        ...record,
        isSynthetic: true,
        importedAt: batchTimestamp,
        importSourceFile: fileName,
      };

      // 3. Write document to Cloud Firestore
      await docRef.set(documentPayload);

      // 4. Verify document write by reading it back from Firestore
      const verifySnap = await docRef.get();
      if (!verifySnap.exists) {
        throw new Error(`Write verification failed: Document ${docId} was not found immediately after set.`);
      }

      // 5. Sync into memory store so live UI & agent reflect the imported data immediately
      syncRecordToMemoryStore(targetCollection, documentPayload);

      importedCount++;
      if (sampleImportedIds.length < 5) {
        sampleImportedIds.push(docId);
      }
    } catch (err: any) {
      failedCount++;
      errors.push({
        row: rowNum,
        reason: err.message || 'Unknown processing error',
      });
    }
  }

  return {
    fileName,
    targetCollection,
    totalRows: rows.length,
    importedCount,
    skippedCount,
    failedCount,
    errors,
    sampleImportedIds,
    isSynthetic: true,
  };
}

function transformRowToEntity(collection: CsvTargetCollection, row: Record<string, string>, idx: number): any {
  // Case-insensitive key lookup helper
  const getVal = (fieldNames: string[]): string => {
    for (const name of fieldNames) {
      for (const key of Object.keys(row)) {
        if (key.toLowerCase() === name.toLowerCase()) {
          return row[key];
        }
      }
    }
    return '';
  };

  switch (collection) {
    case 'patients': {
      const id = getVal(['id', 'patientId', 'patient_id']) || `pat-syn-${100 + idx}`;
      const fullName = getVal(['fullName', 'name', 'full_name']);
      const email = getVal(['email']);
      const phone = getVal(['phone', 'phoneNumber']) || '+1 (555) 000-0000';
      const dateOfBirth = getVal(['dateOfBirth', 'dob']);
      const age = Number(getVal(['age'])) || (dateOfBirth ? calculateAge(dateOfBirth) : 35);
      const gender = getVal(['gender']) || 'Other';
      const isReturning = parseBool(getVal(['isReturning', 'is_returning']), false);
      const consentGiven = parseBool(getVal(['consentGiven', 'consent']), true);

      return {
        id,
        fullName,
        email,
        phone,
        dateOfBirth,
        age,
        gender,
        isReturning,
        consentGiven,
        createdAt: getVal(['createdAt']) || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'medical_history': {
      const patientId = getVal(['patientId', 'patient_id']);
      const id = getVal(['id', 'historyId']) || `hist-${patientId || idx + 1}`;
      const chronicConditions = parseList(getVal(['chronicConditions', 'conditions']));
      const allergies = parseList(getVal(['allergies']));
      const currentMedications = parseList(getVal(['currentMedications', 'medications']));
      const surgeries = parseList(getVal(['surgeries']));
      const previousVisitsCount = Number(getVal(['previousVisitsCount', 'visits'])) || 0;
      const lastVisitDate = getVal(['lastVisitDate', 'lastVisit']);

      return {
        id,
        patientId,
        chronicConditions,
        allergies,
        currentMedications,
        surgeries,
        previousVisitsCount,
        lastVisitDate,
      };
    }

    case 'doctors': {
      const id = getVal(['id', 'doctorId', 'doctor_id']) || `doc-imported-${idx + 1}`;
      const name = getVal(['name', 'doctorName']);
      const title = getVal(['title']) || 'MD Specialist';
      const specialty = (getVal(['specialty']) || 'General Physician') as DoctorSpecialty;
      const qualifications = getVal(['qualifications']) || 'Board Certified Physician';
      const bio = getVal(['bio']) || 'Clinical practitioner providing comprehensive care.';
      const roomNumber = getVal(['roomNumber', 'room']) || 'Suite 200';
      const avatarUrl =
        getVal(['avatarUrl', 'avatar']) ||
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300';
      const availableDays = parseList(getVal(['availableDays', 'days'])) as any;
      const workingHoursStart = getVal(['workingHoursStart', 'startTime', 'start']) || '09:00';
      const workingHoursEnd = getVal(['workingHoursEnd', 'endTime', 'end']) || '17:00';
      const slotDurationMinutes = Number(getVal(['slotDurationMinutes', 'slotDuration'])) || 30;
      const status = (getVal(['status']) || 'ACTIVE') as any;

      return {
        id,
        name,
        title,
        specialty,
        qualifications,
        bio,
        roomNumber,
        avatarUrl,
        availableDays: availableDays.length > 0 ? availableDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: { start: workingHoursStart, end: workingHoursEnd },
        slotDurationMinutes,
        isAvailableToday: true,
        status,
      };
    }

    case 'doctor_availability': {
      const doctorId = getVal(['doctorId', 'doctor_id']);
      const date = getVal(['date']) || new Date().toISOString().split('T')[0];
      const startTime = getVal(['startTime', 'start_time', 'time']) || '09:00';
      const endTime = getVal(['endTime', 'end_time']) || '09:30';
      const slotId = getVal(['slotId', 'id', 'slot_id']) || `slot-${doctorId}-${date}-${startTime}`;
      const doctorName = getVal(['doctorName', 'doctor_name']) || 'Physician';
      const specialty = (getVal(['specialty']) || 'General Physician') as DoctorSpecialty;
      const isBooked = parseBool(getVal(['isBooked', 'is_booked']), false);

      return {
        slotId,
        id: slotId,
        doctorId,
        doctorName,
        specialty,
        date,
        startTime,
        endTime,
        isBooked,
      };
    }

    case 'appointments': {
      const id = getVal(['id', 'appointmentId', 'appointment_id']) || `apt-syn-${idx + 1}`;
      const bookingId = getVal(['bookingId', 'booking_id']) || `BK-${700000 + idx}`;
      const patientId = getVal(['patientId', 'patient_id']) || `pat-${idx + 1}`;
      const patientName = getVal(['patientName', 'patient_name']);
      const patientEmail = getVal(['patientEmail', 'patient_email']) || 'patient@example.com';
      const patientPhone = getVal(['patientPhone', 'patient_phone']) || '+1 (555) 000-0000';
      const doctorId = getVal(['doctorId', 'doctor_id']) || 'doc-gp-1';
      const doctorName = getVal(['doctorName', 'doctor_name']) || 'Dr. Sarah Jenkins';
      const doctorSpecialty = (getVal(['doctorSpecialty', 'specialty']) || 'General Physician') as DoctorSpecialty;
      const date = getVal(['date']) || new Date().toISOString().split('T')[0];
      const time = getVal(['time', 'startTime']) || '10:00';
      const durationMinutes = Number(getVal(['durationMinutes', 'duration'])) || 30;
      const clinicName = getVal(['clinicName']) || 'PulseCare Medical Center';
      const clinicAddress = getVal(['clinicAddress']) || '742 Evergreen Terrace, Medical Suite 400';
      const status = (getVal(['status']) || 'CONFIRMED') as any;
      const urgency = (getVal(['urgency']) || 'GREEN') as TriageUrgency;
      const chiefComplaint = getVal(['chiefComplaint', 'complaint']) || 'Routine Clinical Review';

      return {
        id,
        bookingId,
        patientId,
        patientName,
        patientEmail,
        patientPhone,
        doctorId,
        doctorName,
        doctorSpecialty,
        date,
        time,
        durationMinutes,
        clinicName,
        clinicAddress,
        status,
        urgency,
        chiefComplaint,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    case 'triage_test_data': {
      const id = getVal(['id', 'testId', 'test_id']) || `tri-test-${idx + 1}`;
      const complaint = getVal(['complaint', 'chiefComplaint']);
      const symptoms = parseList(getVal(['symptoms']));
      const severity = Number(getVal(['severity'])) || 5;
      const duration = getVal(['duration']) || '1 day';
      const onset = getVal(['onset']) || 'Gradual';
      const associatedSymptoms = parseList(getVal(['associatedSymptoms']));
      const expectedUrgency = (getVal(['expectedUrgency', 'urgency']) || 'GREEN') as TriageUrgency;
      const expectedSpecialty = (getVal(['expectedSpecialty', 'specialty']) || 'General Physician') as DoctorSpecialty;
      const isEmergency = parseBool(getVal(['isEmergency', 'emergency']), expectedUrgency === 'RED');
      const notes = getVal(['notes']) || '';

      return {
        id,
        complaint,
        symptoms,
        severity,
        duration,
        onset,
        associatedSymptoms,
        expectedUrgency,
        expectedSpecialty,
        isEmergency,
        notes,
      };
    }

    case 'evaluation_test_cases': {
      const id = getVal(['id', 'testId', 'caseId', 'tcId']) || `TC${String(idx + 1).padStart(2, '0')}`;
      const title = getVal(['title', 'name']);
      const scenario = getVal(['scenario', 'description']) || title;
      const patientName = getVal(['patientName', 'patient']) || 'Test Patient';
      const isReturning = parseBool(getVal(['isReturning']), false);
      const complaint = getVal(['complaint', 'primaryComplaint']) || title;
      const symptoms = parseList(getVal(['symptoms']));
      const requestMedication = parseBool(getVal(['requestMedication']), false);
      const requestedSpecialty = getVal(['requestedSpecialty']);
      const expectedUrgency = getVal(['expectedUrgency']) || 'GREEN';
      const expectedSpecialty = getVal(['expectedSpecialty']) || 'General Physician';
      const expectedOutcome = getVal(['expectedOutcome', 'outcome']) || 'Appropriate handling';
      const safetyCheck = getVal(['safetyCheck', 'safety']) || 'Clinical safety guardrail verified';

      return {
        id,
        title,
        scenario,
        patientProfile: {
          fullName: patientName,
          isReturning,
          complaint,
          symptoms,
          requestMedication,
          requestedSpecialty,
        },
        expectedUrgency,
        expectedSpecialty,
        expectedOutcome,
        safetyCheck,
      };
    }
  }
}

function calculateAge(dobStr: string): number {
  try {
    const dob = new Date(dobStr);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch {
    return 40;
  }
}

// Sync into in-memory store to keep state coherent across the application
function syncRecordToMemoryStore(collection: CsvTargetCollection, record: any) {
  try {
    switch (collection) {
      case 'patients': {
        const existing = clinicStore.getPatientById(record.id);
        if (!existing) {
          const newPatient: Patient = {
            id: record.id,
            fullName: record.fullName,
            email: record.email,
            phone: record.phone,
            dateOfBirth: record.dateOfBirth,
            age: record.age,
            gender: record.gender,
            isReturning: record.isReturning,
            medicalHistory: {
              chronicConditions: [],
              allergies: [],
              currentMedications: [],
              surgeries: [],
              previousVisitsCount: record.isReturning ? 2 : 0,
            },
            consentGiven: record.consentGiven,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          };
          (clinicStore as any).patients?.set(record.id, newPatient);
        }
        break;
      }

      case 'medical_history': {
        const patient = clinicStore.getPatientById(record.patientId);
        if (patient) {
          patient.medicalHistory = {
            chronicConditions: record.chronicConditions || [],
            allergies: record.allergies || [],
            currentMedications: record.currentMedications || [],
            surgeries: record.surgeries || [],
            previousVisitsCount: record.previousVisitsCount || 1,
            lastVisitDate: record.lastVisitDate,
          };
        }
        break;
      }

      case 'doctors': {
        const existingDoc = clinicStore.getDoctorById(record.id);
        if (!existingDoc) {
          (clinicStore as any).doctors?.set(record.id, record as Doctor);
        }
        break;
      }

      case 'doctor_availability': {
        (clinicStore as any).slots?.set(record.slotId, record as DoctorSlot);
        break;
      }

      case 'appointments': {
        (clinicStore as any).appointments?.set(record.id, record as Appointment);
        break;
      }
    }
  } catch (err) {
    console.warn(`[CsvImporter] Warning syncing to memory store:`, err);
  }
}

// Automated Test Suite for CSV Import
export async function runCsvImportTestSuite(): Promise<{
  allPassed: boolean;
  results: { title: string; passed: boolean; details: string; error?: string }[];
}> {
  const results: { title: string; passed: boolean; details: string; error?: string }[] = [];
  const db = getFirestoreDb();

  if (!db) {
    return {
      allPassed: false,
      results: [
        {
          title: 'Cloud Firestore Connectivity',
          passed: false,
          details: 'Cannot run test suite without active Cloud Firestore database connection.',
        },
      ],
    };
  }

  // --- Test 1: Valid CSV Parsing & Import ---
  try {
    const testCsv = `id,fullName,email,phone,dateOfBirth,age,gender,isReturning,consentGiven
pat-test-suite-01,Test User Alice,alice.test@example.com,+1 555-0101,1990-01-01,36,Female,false,true`;

    const res = await importCsvFile('test_patients.csv', testCsv, 'patients');
    const passed = res.importedCount === 1 || res.skippedCount === 1; // if already imported, skipped is ok
    results.push({
      title: 'Valid CSV Parsing & Firestore Ingestion',
      passed,
      details: `Imported: ${res.importedCount}, Skipped: ${res.skippedCount}, Failed: ${res.failedCount}`,
    });
  } catch (err: any) {
    results.push({
      title: 'Valid CSV Parsing & Firestore Ingestion',
      passed: false,
      details: 'Exception thrown during import',
      error: err.message,
    });
  }

  // --- Test 2: Duplicate Import Prevention ---
  try {
    const duplicateCsv = `id,fullName,email,phone,dateOfBirth,age,gender,isReturning,consentGiven
pat-test-suite-01,Test User Alice,alice.test@example.com,+1 555-0101,1990-01-01,36,Female,false,true`;

    const resDup = await importCsvFile('test_patients.csv', duplicateCsv, 'patients');
    const passed = resDup.skippedCount === 1 && resDup.importedCount === 0;
    results.push({
      title: 'Duplicate Import Prevention',
      passed,
      details: `Second import was skipped cleanly: skippedCount=${resDup.skippedCount}, importedCount=${resDup.importedCount}`,
    });
  } catch (err: any) {
    results.push({
      title: 'Duplicate Import Prevention',
      passed: false,
      details: 'Exception in duplicate check',
      error: err.message,
    });
  }

  // --- Test 3: Real Patient Overwrite Protection ---
  try {
    const realPatientId = 'pat-real-protected-01';
    // Seed a real (isSynthetic: false) record directly into Firestore
    await db.collection('patients').doc(realPatientId).set({
      id: realPatientId,
      fullName: 'Real Verified Patient',
      email: 'real.patient@example.com',
      isSynthetic: false,
      createdAt: new Date().toISOString(),
    });

    // Attempt to overwrite via CSV
    const overwriteAttemptCsv = `id,fullName,email,phone,dateOfBirth,age,gender,isReturning,consentGiven
${realPatientId},Attacker Fake Patient,fake@example.com,+1 555-9999,1980-01-01,46,Male,false,true`;

    const resOverwrite = await importCsvFile('overwrite_test.csv', overwriteAttemptCsv, 'patients');
    // Verify document in Firestore still has original real data
    const verifyDoc = await db.collection('patients').doc(realPatientId).get();
    const data = verifyDoc.data();
    const isProtected = data?.fullName === 'Real Verified Patient' && data?.isSynthetic === false;
    const passed = isProtected && resOverwrite.skippedCount === 1;

    results.push({
      title: 'Real Patient Overwrite Protection',
      passed,
      details: isProtected
        ? 'Real patient document was shielded from overwrite; CSV row skipped.'
        : 'SECURITY FAILURE: Real patient document was modified!',
    });
  } catch (err: any) {
    results.push({
      title: 'Real Patient Overwrite Protection',
      passed: false,
      details: 'Exception during overwrite protection test',
      error: err.message,
    });
  }

  // --- Test 4: Invalid CSV Rejection (Missing Required Headers) ---
  try {
    const invalidHeaderCsv = `foo,bar,baz
val1,val2,val3`;

    const resInvalid = await importCsvFile('invalid.csv', invalidHeaderCsv, 'patients');
    const passed = resInvalid.failedCount > 0 && resInvalid.errors.length > 0;
    results.push({
      title: 'Invalid CSV Rejection (Missing Headers)',
      passed,
      details: `Correctly rejected invalid CSV: ${resInvalid.errors[0]?.reason}`,
    });
  } catch (err: any) {
    results.push({
      title: 'Invalid CSV Rejection (Missing Headers)',
      passed: false,
      details: 'Exception in invalid CSV test',
      error: err.message,
    });
  }

  // --- Test 5: Synthetic Test Record Tagging ---
  try {
    const syntheticId = 'pat-test-suite-01';
    const docSnap = await db.collection('patients').doc(syntheticId).get();
    const data = docSnap.data();
    const passed = data?.isSynthetic === true && Boolean(data?.importedAt);
    results.push({
      title: 'Synthetic Record Tagging & Audit Attributes',
      passed,
      details: passed
        ? `Document tagged with isSynthetic: true and importedAt: ${data?.importedAt}`
        : 'isSynthetic flag missing or false!',
    });
  } catch (err: any) {
    results.push({
      title: 'Synthetic Record Tagging & Audit Attributes',
      passed: false,
      details: 'Exception verifying synthetic tag',
      error: err.message,
    });
  }

  // --- Test 6: Direct Firestore Retrieval Verification ---
  try {
    const snap = await db.collection('patients').limit(10).get();
    const passed = snap.size > 0;
    results.push({
      title: 'Direct Firestore Document Retrieval Verification',
      passed,
      details: `Successfully retrieved ${snap.size} documents directly from Cloud Firestore collection 'patients'.`,
    });
  } catch (err: any) {
    results.push({
      title: 'Direct Firestore Document Retrieval Verification',
      passed: false,
      details: 'Exception during Firestore query',
      error: err.message,
    });
  }

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}
