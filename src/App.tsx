/**
 * PulseClinic AI - Main Application Component
 * Enterprise Autonomous Healthcare Intake, Triage & Booking Platform
 * Full RBAC Authentication for Patients, Doctors, and Staff with Cloud Firestore persistence.
 */

import React, { useState, useEffect } from 'react';
import { Header, AppTab } from './components/Header.tsx';
import { PatientPortal } from './components/PatientPortal.tsx';
import { PatientDashboard } from './components/PatientDashboard.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { DoctorDashboard } from './components/DoctorDashboard.tsx';
import { AgentMonitor } from './components/AgentMonitor.tsx';
import { EvaluationView } from './components/EvaluationView.tsx';
import { AuthView, AuthMode } from './components/AuthView.tsx';
import { RoleGatewayLanding } from './components/RoleGatewayLanding.tsx';
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
  UserRole,
} from './types/index.ts';
import { Lock, ShieldAlert, Stethoscope, ArrowRight, UserCheck, KeyRound } from 'lucide-react';

export default function App() {
  // Initial active view starts on 'landing' so user sees the 3 distinct persona choices
  const [activeTab, setActiveTab] = useState<AppTab>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>('patient-login');
  const [patientViewMode, setPatientViewMode] = useState<'dashboard' | 'intake'>('dashboard');

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

  // Active Authenticated User & Session (starts as null to require login/signup)
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    specialization?: string;
    qualification?: string;
    experience?: string;
    licenseNumber?: string;
    status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'REJECTED' | 'SUSPENDED';
    createdAt: string;
  } | null>(null);

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

    // Check stored session on initial load
    const storedToken = localStorage.getItem('pulseclinic_auth_token');
    if (storedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setCurrentUser(res.data);
            setSessionToken(storedToken);

            // Automatically route to their role's workspace
            if (res.data.role === 'doctor') {
              setActiveTab('doctor');
            } else if (res.data.role === 'staff' || res.data.role === 'admin') {
              setActiveTab('staff');
            } else if (res.data.role === 'patient') {
              setActiveTab('patient');
            }
          } else {
            localStorage.removeItem('pulseclinic_auth_token');
            setCurrentUser(null);
            setActiveTab('landing');
          }
        })
        .catch(() => {
          localStorage.removeItem('pulseclinic_auth_token');
          setCurrentUser(null);
          setActiveTab('landing');
        });
    } else {
      // First page is role selection landing page
      setActiveTab('landing');
    }
  }, []);

  // Update currentPatient whenever currentUser is patient
  useEffect(() => {
    if (currentUser && currentUser.role === 'patient') {
      const match = patients.find((p) => p.email.toLowerCase() === currentUser.email.toLowerCase());
      if (match) {
        setCurrentPatient(match);
      } else {
        setCurrentPatient({
          id: currentUser.uid,
          fullName: currentUser.displayName,
          email: currentUser.email,
          phone: currentUser.phone || '+1 (555) 234-5678',
          dateOfBirth: currentUser.dateOfBirth,
          gender: currentUser.gender,
          isReturning: true,
          medicalHistory: {
            chronicConditions: [],
            allergies: [],
            currentMedications: [],
            surgeries: [],
            previousVisitsCount: 1,
          },
          consentGiven: true,
          createdAt: currentUser.createdAt || new Date().toISOString(),
          updatedAt: currentUser.createdAt || new Date().toISOString(),
        });
      }
    } else {
      setCurrentPatient(null);
    }
  }, [currentUser, patients]);

  // Handle successful login or registration
  const handleAuthSuccess = (user: any, token: string) => {
    setCurrentUser(user);
    setSessionToken(token);
    localStorage.setItem('pulseclinic_auth_token', token);

    fetchAllData();

    if (user.role === 'patient') {
      setActiveTab('patient');
    } else if (user.role === 'doctor') {
      setActiveTab('doctor');
    } else if (user.role === 'staff' || user.role === 'admin') {
      setActiveTab('staff');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    } finally {
      setCurrentUser(null);
      setCurrentPatient(null);
      setSessionToken(null);
      localStorage.removeItem('pulseclinic_auth_token');
      setActiveTab('landing');
    }
  };

  const handleOpenAuth = (mode: string = 'patient-login') => {
    setAuthInitialMode(mode as AuthMode);
    setActiveTab('auth');
  };

  // Quick Demo Access Login Handler
  const handleQuickDemoLogin = async (role: 'patient' | 'doctor' | 'staff') => {
    let email = 'eleanor.hughes@example.com';
    let password = 'PatientPass123!';
    if (role === 'doctor') {
      email = 'dr.vance@pulseclinic.internal';
      password = 'DoctorPass123!';
    } else if (role === 'staff') {
      email = 'staff@pulseclinic.internal';
      password = 'PulseCare2026!';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        handleAuthSuccess(data.data.user, data.data.token);
      } else {
        handleOpenAuth(`${role}-login`);
      }
    } catch (err) {
      handleOpenAuth(`${role}-login`);
    }
  };

  // Role verification helper
  const isPatient = currentUser?.role === 'patient';
  const isDoctor = currentUser?.role === 'doctor';
  const isStaff = currentUser?.role === 'staff' || currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
      />

      <main className="flex-1 pb-16">
        {/* FIRST PAGE: ROLE SELECTION & HEALTHCARE GATEWAY */}
        {activeTab === 'landing' && (
          <RoleGatewayLanding
            onSelectRole={(mode) => {
              setAuthInitialMode(mode);
              setActiveTab('auth');
            }}
            onQuickDemoLogin={handleQuickDemoLogin}
          />
        )}

        {/* AUTHENTICATION VIEW (Patient, Doctor & Staff Login / Register) */}
        {activeTab === 'auth' && (
          <AuthView
            initialMode={authInitialMode}
            onSuccess={handleAuthSuccess}
            onCancel={() => setActiveTab('landing')}
          />
        )}

        {/* PATIENT PORTAL (Guarded: requires patient authentication) */}
        {activeTab === 'patient' && (
          <>
            {!currentUser ? (
              <AuthView
                initialMode="patient-login"
                onSuccess={handleAuthSuccess}
                onCancel={() => setActiveTab('landing')}
              />
            ) : !isPatient ? (
              <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Signed In As {currentUser.role.toUpperCase()}</h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  You are currently authenticated as <strong>{currentUser.displayName}</strong> ({currentUser.role}).
                  To access patient self-service intake, please sign in with a patient account.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab(isDoctor ? 'doctor' : 'staff')}
                    className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-teal-700 transition-colors"
                  >
                    Go to Your {isDoctor ? 'Doctor' : 'Staff'} Workspace
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Switch Account (Sign Out)
                  </button>
                </div>
              </div>
            ) : patientViewMode === 'dashboard' ? (
              <PatientDashboard
                currentUser={currentUser}
                onStartIntake={() => setPatientViewMode('intake')}
                onLogout={handleLogout}
                onRefreshGlobalData={fetchAllData}
              />
            ) : (
              <PatientPortal
                currentPatient={currentPatient}
                onUpdatePatient={(p) => {
                  setCurrentPatient(p);
                  if (currentUser && currentUser.role === 'patient') {
                    setCurrentUser({
                      ...currentUser,
                      displayName: p.fullName,
                      email: p.email,
                      phone: p.phone,
                    });
                  }
                }}
                onRefreshData={fetchAllData}
                doctors={doctors}
                appointments={appointments}
                onBackToDashboard={() => setPatientViewMode('dashboard')}
              />
            )}
          </>
        )}

        {/* DOCTOR DASHBOARD & ROLE-BASED ACCESS CONTROL */}
        {activeTab === 'doctor' && (
          <>
            {!currentUser ? (
              <AuthView
                initialMode="doctor-login"
                onSuccess={handleAuthSuccess}
                onCancel={() => setActiveTab('landing')}
              />
            ) : isPatient ? (
              <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Access Restricted (Role-Based Access Control)</h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  You are signed in as a Patient (<strong>{currentUser?.displayName}</strong>).
                  The Doctor Portal is reserved for verified physicians to manage appointments, clinical notes, and triage reviews.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('patient')}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Return to Patient Portal
                  </button>
                  <button
                    onClick={() => {
                      setAuthInitialMode('doctor-login');
                      setActiveTab('auth');
                    }}
                    className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Sign in with Doctor Credentials
                  </button>
                </div>
              </div>
            ) : isDoctor && currentUser ? (
              <DoctorDashboard
                doctor={currentUser as any}
                appointments={appointments}
                patients={patients}
                triageHistory={triageHistory}
                onRefreshData={fetchAllData}
                onLogout={handleLogout}
              />
            ) : isStaff ? (
              /* Staff can inspect doctor schedules */
              <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-800 font-medium">
                  <span>Signed in as Staff: Viewing Physician Catalog & Clinical Schedules</span>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className="px-3 py-1 bg-white border border-teal-300 rounded-lg font-bold"
                  >
                    Go to Staff Dashboard
                  </button>
                </div>
                <DoctorDashboard
                  doctor={{
                    uid: 'doc-cardio-1',
                    email: 'dr.vance@pulseclinic.internal',
                    displayName: 'Dr. Marcus Vance',
                    role: 'doctor',
                    specialization: 'Cardiologist',
                    qualification: 'MD, FACC, Johns Hopkins',
                    experience: '12 years',
                    licenseNumber: 'MD-CARDIO-8849',
                    status: 'ACTIVE',
                    phone: '+1 (555) 432-8765',
                  }}
                  appointments={appointments}
                  patients={patients}
                  triageHistory={triageHistory}
                  onRefreshData={fetchAllData}
                  onLogout={handleLogout}
                />
              </div>
            ) : (
              <AuthView
                initialMode="doctor-login"
                onSuccess={handleAuthSuccess}
                onCancel={() => setActiveTab('landing')}
              />
            )}
          </>
        )}

        {/* STAFF DASHBOARD & ROLE GUARD */}
        {activeTab === 'staff' && (
          <>
            {!currentUser ? (
              <AuthView
                initialMode="staff-login"
                onSuccess={handleAuthSuccess}
                onCancel={() => setActiveTab('landing')}
              />
            ) : isPatient ? (
              <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Clinical Staff Authorization Required</h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  You are signed in as a Patient (<strong>{currentUser?.displayName}</strong>).
                  Administrative triage queues, doctor credential verification, and Firestore CSV imports require clinical staff credentials.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('patient')}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Return to Patient Portal
                  </button>
                  <button
                    onClick={() => {
                      setAuthInitialMode('staff-login');
                      setActiveTab('auth');
                    }}
                    className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Sign in with Staff Credentials
                  </button>
                </div>
              </div>
            ) : (
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
                currentUserRole={currentUser?.role === 'doctor' ? 'doctor' : 'staff'}
              />
            )}
          </>
        )}

        {/* AGENT MONITOR (Observability) */}
        {activeTab === 'agent' && (
          <>
            {!currentUser ? (
              <AuthView
                initialMode="staff-login"
                onSuccess={handleAuthSuccess}
                onCancel={() => setActiveTab('landing')}
              />
            ) : isPatient ? (
              <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
                <Lock className="w-12 h-12 text-slate-400 mx-auto" />
                <h2 className="text-lg font-bold text-slate-800">Internal Agent Telemetry Restricted</h2>
                <p className="text-xs text-slate-500">Autonomous workflow logs and tool calls are visible to clinical staff and engineering only.</p>
                <button
                  onClick={() => setActiveTab('patient')}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold"
                >
                  Back to Patient Portal
                </button>
              </div>
            ) : (
              <AgentMonitor
                executionLogs={executionLogs}
                systemStatus={systemStatus}
                onRefreshData={fetchAllData}
              />
            )}
          </>
        )}

        {/* EVALUATION ENGINE */}
        {activeTab === 'evaluation' && (
          <>
            {!currentUser ? (
              <AuthView
                initialMode="staff-login"
                onSuccess={handleAuthSuccess}
                onCancel={() => setActiveTab('landing')}
              />
            ) : isPatient ? (
              <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
                <Lock className="w-12 h-12 text-slate-400 mx-auto" />
                <h2 className="text-lg font-bold text-slate-800">Evaluation Engine Restricted</h2>
                <p className="text-xs text-slate-500">Clinical test cases and benchmark evaluations are restricted to clinic staff.</p>
                <button
                  onClick={() => setActiveTab('patient')}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold"
                >
                  Back to Patient Portal
                </button>
              </div>
            ) : (
              <EvaluationView
                evaluationMetrics={evaluationMetrics}
                onRefreshData={fetchAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>
            <strong>PulseClinic AI</strong> • Intelligent Patient Intake, Triage & Autonomous Scheduling
          </p>
          <p className="text-slate-400">
            Firebase Authentication • Cloud Firestore RBAC • Clinical Safety Protocol • Transactional Notifications
          </p>
        </div>
      </footer>
    </div>
  );
}
