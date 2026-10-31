/**
 * PulseClinic AI - Node.js Express API Server & Vite Integration
 * Enterprise Autonomous Healthcare Intake, Triage & Booking Platform
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import fs from 'fs';
import { clinicStore } from './src/server/store.ts';
import { performClinicalTriage, checkPrescriptionRequest, evaluateRedFlags } from './src/server/triage.ts';
import { CalendarService } from './src/server/calendar.ts';
import { ClinicAgentWorkflow, AgentTools } from './src/server/agent.ts';
import { EvaluationEngine } from './src/server/evaluator.ts';
import { createBrowserbaseSession } from './src/server/browserbase.ts';
import { sendAppointmentEmail } from './src/server/email.ts';
import { importCsvFile, runCsvImportTestSuite } from './src/server/csvImporter.ts';
import { getLiveFirestoreCollectionStats, verifyFirestoreConnection } from './src/server/firebase.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health and System Integrations Status
  app.get('/api/system/status', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: clinicStore.getIntegrationsStatus(),
    });
  });

  // --- DOCTOR ENDPOINTS ---
  app.get('/api/doctors', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getDoctors() });
  });

  app.get('/api/doctors/:id/availability', (req: Request, res: Response) => {
    try {
      const date = req.query.date as string | undefined;
      const data = CalendarService.getDoctorAvailability(req.params.id, date);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // --- CALENDAR & APPOINTMENT REST API ---
  app.get('/api/appointments', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getAppointments() });
  });

  app.get('/api/appointments/:id', (req: Request, res: Response) => {
    const apt = clinicStore.getAppointmentById(req.params.id);
    if (!apt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    res.json({ success: true, data: apt });
  });

  app.post('/api/appointments', async (req: Request, res: Response) => {
    try {
      const { patientId, patientName, patientEmail, patientPhone, slotId, chiefComplaint, urgency, sessionId } = req.body;
      if (!patientName || !patientEmail || !slotId) {
        return res.status(400).json({ success: false, error: 'Missing required booking fields.' });
      }

      const result = await CalendarService.bookAppointment({
        patientId: patientId || `pat-${Date.now()}`,
        patientName,
        patientEmail,
        patientPhone: patientPhone || '+1 (555) 000-0000',
        slotId,
        chiefComplaint: chiefComplaint || 'Routine medical consultation',
        urgency: urgency || 'GREEN',
        sessionId,
      });

      res.status(201).json({ success: true, data: result.appointment, emailNotificationId: result.emailNotificationId });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/appointments/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const cancelled = await CalendarService.cancelAppointment(req.params.id, reason);
      res.json({ success: true, data: cancelled });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/appointments/:id/alternatives', (req: Request, res: Response) => {
    try {
      const alternatives = CalendarService.findAlternativeSlots(req.params.id);
      res.json({ success: true, data: alternatives });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/appointments/:id/rebook', async (req: Request, res: Response) => {
    try {
      const { newSlotId, authorizedByPatient, reason } = req.body;
      const rebooked = await CalendarService.rebookAppointment({
        appointmentId: req.params.id,
        newSlotId,
        authorizedByPatient: Boolean(authorizedByPatient),
        reason,
      });
      res.json({ success: true, data: rebooked });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- PATIENTS & MEMORY ---
  app.get('/api/patients', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getPatients() });
  });

  app.get('/api/patients/:id', (req: Request, res: Response) => {
    const pat = clinicStore.getPatientById(req.params.id);
    if (!pat) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: pat });
  });

  app.post('/api/patients/lookup', (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'Query required' });
    const pat = clinicStore.findPatientByEmailOrPhone(query);
    if (!pat) return res.json({ success: false, message: 'Patient not found' });
    res.json({ success: true, data: pat });
  });

  app.post('/api/patients', (req: Request, res: Response) => {
    const { fullName, email, phone, age, chronicConditions, allergies, currentMedications } = req.body;
    const result = AgentTools.save_patient_intake({
      fullName,
      email,
      phone,
      age: Number(age) || 30,
      chronicConditions,
      allergies,
      currentMedications,
    });
    res.json({ success: true, data: result });
  });

  // --- CLINICAL TRIAGE & RED FLAGS ---
  app.post('/api/triage/assess', (req: Request, res: Response) => {
    const { patientId, complaint, symptoms, severity, duration, onset, associatedSymptoms } = req.body;
    const assessment = performClinicalTriage({
      patientId: patientId || 'temp-id',
      complaint: complaint || 'General malaise',
      symptoms: symptoms || [],
      severity: (Math.min(10, Math.max(1, Number(severity) || 4)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10),
      duration: duration || '1 day',
      onset: onset || 'Sudden',
      associatedSymptoms: associatedSymptoms || [],
    });
    clinicStore.saveTriageAssessment(assessment);
    res.json({ success: true, data: assessment });
  });

  app.get('/api/triage/history', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getTriageAssessments() });
  });

  // --- HUMAN APPROVALS QUEUE ---
  app.get('/api/approvals', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getHumanApprovals() });
  });

  app.post('/api/approvals/:id/resolve', (req: Request, res: Response) => {
    const { status, staffName, notes } = req.body;
    const resolved = clinicStore.resolveHumanApproval(
      req.params.id,
      status || 'APPROVED',
      staffName || 'Staff Clinician',
      notes
    );
    if (!resolved) return res.status(404).json({ success: false, error: 'Approval request not found' });
    res.json({ success: true, data: resolved });
  });

  // --- MULTI-STEP AGENTIC WORKFLOW ---
  app.post('/api/agent/chat', async (req: Request, res: Response) => {
    try {
      const { sessionId, patientId, message, currentIntake, conversationHistory } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
      }

      const outcome = await ClinicAgentWorkflow.processPatientMessage({
        sessionId: sessionId || `session-${Date.now()}`,
        patientId,
        message,
        currentIntake,
        conversationHistory,
      });

      res.json({ success: true, data: outcome });
    } catch (err: any) {
      console.error('[AgentChat] Error handling agent chat:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/agent/logs', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getExecutionLogs() });
  });

  // --- BROWSERBASE TOOL DIRECT ROUTE ---
  app.post('/api/browserbase/check-schedule', async (req: Request, res: Response) => {
    const { doctorId, date } = req.body;
    const bbResult = await createBrowserbaseSession(doctorId || 'doc-gp-1', date);
    res.json({ success: true, data: bbResult });
  });

  // --- EMAIL NOTIFICATIONS ---
  app.get('/api/notifications', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getEmailNotifications() });
  });

  app.post('/api/notifications/:id/retry', async (req: Request, res: Response) => {
    const notif = clinicStore.getEmailNotificationById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });

    const apt = clinicStore.getAppointmentById(notif.appointmentId);
    if (!apt) return res.status(404).json({ success: false, error: 'Associated appointment not found' });

    const retried = await sendAppointmentEmail({
      appointment: apt,
      type: notif.type as any,
    });
    res.json({ success: true, data: retried });
  });

  // --- REBOOKING REQUESTS ---
  app.get('/api/rebooking/requests', (req: Request, res: Response) => {
    res.json({ success: true, data: clinicStore.getRebookingRequests() });
  });

  // --- AUTOMATED EVALUATION ENGINE ---
  app.get('/api/evaluations', (req: Request, res: Response) => {
    const metrics = clinicStore.getEvaluationMetrics();
    res.json({ success: true, data: metrics });
  });

  app.post('/api/evaluations/run', async (req: Request, res: Response) => {
    try {
      console.log('[EvaluationEngine] Running all 12 clinical & operational test cases...');
      const summary = await EvaluationEngine.runAllTests();
      res.json({ success: true, data: summary });
    } catch (err: any) {
      console.error('[EvaluationEngine] Error running test suite:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- SECURE CSV DATA IMPORT & CLOUD FIRESTORE SUITE ---
  const checkStaffAccess = (req: Request, res: Response): boolean => {
    const staffRoleHeader = req.headers['x-staff-role'] as string | undefined;
    const userRoleBody = req.body?.userRole as string | undefined;
    const isAuthorized = staffRoleHeader === 'staff' || staffRoleHeader === 'admin' || userRoleBody === 'staff' || userRoleBody === 'admin';
    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: 'Access Denied: Only authorized clinical staff are permitted to import data into Cloud Firestore.',
      });
      return false;
    }
    return true;
  };

  // 1. Upload & Import CSV Files
  app.post('/api/staff/csv/import', async (req: Request, res: Response) => {
    if (!checkStaffAccess(req, res)) return;

    try {
      const { files, fileName, csvContent, targetCollection } = req.body;

      const fileList: { fileName: string; csvContent: string; targetCollection?: any }[] = [];

      if (Array.isArray(files) && files.length > 0) {
        fileList.push(...files);
      } else if (fileName && csvContent) {
        fileList.push({ fileName, csvContent, targetCollection });
      } else {
        return res.status(400).json({
          success: false,
          error: 'No CSV files provided in payload. Supply fileName & csvContent or a files array.',
        });
      }

      console.log(`[CsvImport] Processing ${fileList.length} CSV file(s) for Firestore ingestion...`);

      const fileResults = [];
      let totalRecords = 0;
      let totalImported = 0;
      let totalSkipped = 0;
      let totalFailed = 0;

      for (const f of fileList) {
        const result = await importCsvFile(f.fileName, f.csvContent, f.targetCollection);
        fileResults.push(result);
        totalRecords += result.totalRows;
        totalImported += result.importedCount;
        totalSkipped += result.skippedCount;
        totalFailed += result.failedCount;
      }

      // Live Firestore verification
      const liveStats = await getLiveFirestoreCollectionStats();

      res.json({
        success: totalFailed === 0 || totalImported > 0,
        timestamp: new Date().toISOString(),
        filesProcessed: fileResults.length,
        totalRecords,
        totalImported,
        totalSkipped,
        totalFailed,
        fileResults,
        firestoreVerified: liveStats.connected,
        firestoreStats: liveStats.collections,
      });
    } catch (err: any) {
      console.error('[CsvImport] Critical import error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Live Cloud Firestore Collection Stats & Verification
  app.get('/api/staff/csv/verify', async (req: Request, res: Response) => {
    try {
      const stats = await getLiveFirestoreCollectionStats();
      const connection = await verifyFirestoreConnection();
      res.json({
        success: stats.connected && connection.connected,
        projectId: stats.projectId,
        connection,
        collections: stats.collections,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[CsvImport] Verification error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Pre-extracted Sample CSV Templates
  app.get('/api/staff/csv/samples', (req: Request, res: Response) => {
    try {
      const sampleDir = path.resolve(__dirname, 'sample_csvs');
      if (!fs.existsSync(sampleDir)) {
        return res.json({ success: true, samples: [] });
      }

      const files = fs.readdirSync(sampleDir).filter((f) => f.endsWith('.csv'));
      const samples = files.map((fileName) => {
        const filePath = path.join(sampleDir, fileName);
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
          fileName,
          content,
          sizeBytes: content.length,
        };
      });

      res.json({ success: true, samples });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. One-Click Batch Import of All 7 Sample CSVs in Relational Sequence
  app.post('/api/staff/csv/import-samples', async (req: Request, res: Response) => {
    if (!checkStaffAccess(req, res)) return;

    try {
      const sampleDir = path.resolve(__dirname, 'sample_csvs');
      if (!fs.existsSync(sampleDir)) {
        return res.status(404).json({ success: false, error: 'sample_csvs directory not found on server.' });
      }

      // Ordered for relational integrity: patients & doctors first, then availability & appointments
      const orderedFiles = [
        'patients.csv',
        'medical_history.csv',
        'doctors.csv',
        'doctor_availability.csv',
        'appointments.csv',
        'triage_test_data.csv',
        'agent_evaluation_test_cases.csv',
      ];

      const fileResults = [];
      let totalRecords = 0;
      let totalImported = 0;
      let totalSkipped = 0;
      let totalFailed = 0;

      for (const fileName of orderedFiles) {
        const filePath = path.join(sampleDir, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const result = await importCsvFile(fileName, content);
          fileResults.push(result);
          totalRecords += result.totalRows;
          totalImported += result.importedCount;
          totalSkipped += result.skippedCount;
          totalFailed += result.failedCount;
        }
      }

      const liveStats = await getLiveFirestoreCollectionStats();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        filesProcessed: fileResults.length,
        totalRecords,
        totalImported,
        totalSkipped,
        totalFailed,
        fileResults,
        firestoreVerified: liveStats.connected,
        firestoreStats: liveStats.collections,
      });
    } catch (err: any) {
      console.error('[CsvImport] Error importing sample CSV files:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Automated Test Suite Runner for Duplicate Import and Invalid CSV Tests
  app.post('/api/staff/csv/test-suite', async (req: Request, res: Response) => {
    if (!checkStaffAccess(req, res)) return;

    try {
      console.log('[CsvTestSuite] Running automated CSV import tests against Cloud Firestore...');
      const report = await runCsvImportTestSuite();
      res.json({
        success: true,
        data: report,
      });
    } catch (err: any) {
      console.error('[CsvTestSuite] Error executing test suite:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mock Clinic Portal Route for Browserbase observation
  app.get('/schedule-portal', (req: Request, res: Response) => {
    const doctorId = (req.query.doctor as string) || 'doc-gp-1';
    const doctor = clinicStore.getDoctorById(doctorId);
    const slots = clinicStore.getDoctorSlots(doctorId);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PulseCare Clinic - Doctor Schedule Portal</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui; padding: 24px; background: #f8fafc; color: #1e293b; }
          .header { background: #0f766e; color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; }
          .slot { padding: 8px 12px; background: white; margin-bottom: 8px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
          .booked { color: #dc2626; font-weight: bold; }
          .open { color: #16a34a; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${doctor ? doctor.name : 'Doctor Schedule'}</h1>
          <p>Specialty: ${doctor?.specialty || 'General'} | Status: ${doctor?.status || 'ACTIVE'}</p>
        </div>
        <h2>Upcoming Scheduled Slots</h2>
        <div id="slots-container">
          ${slots.slice(0, 15).map(s => `
            <div class="slot">
              <span><strong>${s.date}</strong> at ${s.startTime} - ${s.endTime}</span>
              <span class="${s.isBooked ? 'booked' : 'open'}">${s.isBooked ? 'RESERVED' : 'AVAILABLE'}</span>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `);
  });

  // Mount Vite or static build
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PulseClinic AI] Server active and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
