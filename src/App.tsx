/**
 * PulseClinic AI - Main Application Component
 * Ziro.digital National Level Agentic AI Hackathon 2026 – Problem Statement 17
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { PatientPortal } from './components/PatientPortal.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { AgentMonitor } from './components/AgentMonitor.tsx';
import { EvaluationView } from './components/EvaluationView.tsx';
import {
  Patient,
  Doctor,
  Appointment,
  TriageAssessment,
  HumanApproval,
  EmailNotification,
  RebookingRequest,
  AgentExecutionLog,
  EvaluationMetricSummary,
  SystemIntegrationsStatus,
} from './types/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<'patient' | 'staff' | 'agent' | 'evaluation'>('patient');

  // Application Data States
  const [systemStatus, setSystemStatus] = useState<SystemIntegrationsStatus | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [triageHistory, setTriageHistory] = useState<TriageAssessment[]>([]);
  const [approvals, setApprovals] = useState<HumanApproval[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<EmailNotification[]>([]);
  const [rebookingRequests, setRebookingRequests] = useState<RebookingRequest[]>([]);
  const [executionLogs, setExecutionLogs] = useState<AgentExecutionLog[]>([]);
  const [evaluationMetrics, setEvaluationMetrics] = useState<EvaluationMetricSummary | null>(null);

  // Active User / Patient Session
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: 'patient' | 'staff';
    isReturning?: boolean;
    email?: string;
  }>({
    name: 'Eleanor Hughes',
    role: 'patient',
    isReturning: true,
    email: 'eleanor.hughes@example.com',
  });

  // Fetch all live data from backend REST endpoints
  const fetchAllData = async () => {
    try {
      // System status
      const statusRes = await fetch('/api/system/status');
      const statusJson = await statusRes.json();
      if (statusJson.success) setSystemStatus(statusJson.data);

      // Doctors
      const docsRes = await fetch('/api/doctors');
      const docsJson = await docsRes.json();
      if (docsJson.success) setDoctors(docsJson.data);

      // Patients
      const patsRes = await fetch('/api/patients');
      const patsJson = await patsRes.json();
      if (patsJson.success) {
        setPatients(patsJson.data);
        // Default to Eleanor Hughes if none selected
        if (!currentPatient && patsJson.data.length > 0) {
          const eleanor = patsJson.data.find((p: Patient) => p.email.includes('eleanor'));
          setCurrentPatient(eleanor || patsJson.data[0]);
        }
      }

      // Appointments
      const aptsRes = await fetch('/api/appointments');
      const aptsJson = await aptsRes.json();
      if (aptsJson.success) setAppointments(aptsJson.data);

      // Triage history
      const triageRes = await fetch('/api/triage/history');
      const triageJson = await triageRes.json();
      if (triageJson.success) setTriageHistory(triageJson.data);

      // Approvals
      const apprRes = await fetch('/api/approvals');
      const apprJson = await apprRes.json();
      if (apprJson.success) setApprovals(apprJson.data);

      // Email notifications
      const notifRes = await fetch('/api/notifications');
      const notifJson = await notifRes.json();
      if (notifJson.success) setEmailNotifications(notifJson.data);

      // Rebooking requests
      const rebookRes = await fetch('/api/rebooking/requests');
      const rebookJson = await rebookRes.json();
      if (rebookJson.success) setRebookingRequests(rebookJson.data);

      // Agent logs
      const logsRes = await fetch('/api/agent/logs');
      const logsJson = await logsRes.json();
      if (logsJson.success) setExecutionLogs(logsJson.data);

      // Evaluation metrics
      const evalRes = await fetch('/api/evaluations');
      const evalJson = await evalRes.json();
      if (evalJson.success && evalJson.data) setEvaluationMetrics(evalJson.data);
    } catch (err) {
      console.error('[App] Error fetching initial data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle switching active user/role demo
  const handleSwitchUser = (role: 'patient' | 'staff', isReturning?: boolean) => {
    if (role === 'staff') {
      setCurrentUser({
        name: 'Dr. Sarah Jenkins',
        role: 'staff',
        email: 's.jenkins@pulsecare.internal',
      });
      setActiveTab('staff');
    } else {
      if (isReturning) {
        const eleanor = patients.find((p) => p.email.includes('eleanor')) || null;
        setCurrentPatient(eleanor);
        setCurrentUser({
          name: 'Eleanor Hughes',
          role: 'patient',
          isReturning: true,
          email: 'eleanor.hughes@example.com',
        });
      } else {
        setCurrentPatient(null);
        setCurrentUser({
          name: 'New Patient Intake',
          role: 'patient',
          isReturning: false,
          email: '',
        });
      }
      setActiveTab('patient');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'patient' && (
          <PatientPortal
            currentPatient={currentPatient}
            onUpdatePatient={(p) => {
              setCurrentPatient(p);
              setCurrentUser({
                name: p.fullName,
                role: 'patient',
                isReturning: p.isReturning,
                email: p.email,
              });
            }}
            onRefreshData={fetchAllData}
            doctors={doctors}
            appointments={appointments}
          />
        )}

        {activeTab === 'staff' && (
          <StaffDashboard
            patients={patients}
            doctors={doctors}
            appointments={appointments}
            triageHistory={triageHistory}
            approvals={approvals}
            emailNotifications={emailNotifications}
            rebookingRequests={rebookingRequests}
            executionLogs={executionLogs}
            onRefreshData={fetchAllData}
            currentUserRole={currentUser.role}
          />
        )}

        {activeTab === 'agent' && (
          <AgentMonitor
            executionLogs={executionLogs}
            systemStatus={systemStatus}
            onRefreshData={fetchAllData}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView
            evaluationMetrics={evaluationMetrics}
            onRefreshData={fetchAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>
            <strong>PulseClinic AI</strong> • Intelligent Patient Intake, Triage & Autonomous Scheduling
          </p>
          <p className="text-slate-400">
            Clinical Safety Protocol • Deterministic Guardrails • Cloud Browser Automation • Transactional Email Delivery
          </p>
        </div>
      </footer>
    </div>
  );
}
