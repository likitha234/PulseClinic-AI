import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  AlertOctagon,
  Clock,
  ShieldCheck,
  Stethoscope,
  XCircle,
  RefreshCw,
  Mail,
  Activity,
  CheckCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Award,
  AlertTriangle,
} from 'lucide-react';
import {
  Patient,
  Doctor,
  Appointment,
  TriageAssessment,
  HumanApproval,
  EmailNotification,
  RebookingRequest,
  AgentExecutionLog,
} from '../types/index.ts';
import { CsvDataImportView } from './CsvDataImportView.tsx';

interface StaffDashboardProps {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  triageHistory: TriageAssessment[];
  approvals: HumanApproval[];
  emailNotifications: EmailNotification[];
  rebookingRequests: RebookingRequest[];
  executionLogs: AgentExecutionLog[];
  onRefreshData: () => void;
  currentUserRole?: 'patient' | 'staff' | 'admin' | 'doctor';
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  patients,
  doctors,
  appointments,
  triageHistory,
  approvals,
  emailNotifications,
  rebookingRequests,
  executionLogs,
  onRefreshData,
  currentUserRole = 'staff',
}) => {
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'triage-queue'
    | 'emergency-alerts'
    | 'human-approvals'
    | 'appointments'
    | 'doctors'
    | 'doctor-verifications'
    | 'rebooking'
    | 'emails'
    | 'patients'
    | 'csv-import'
  >('overview');

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [verifyingDoctorId, setVerifyingDoctorId] = useState<string | null>(null);

  const fetchPendingDoctors = async () => {
    try {
      const res = await fetch('/api/staff/doctors/pending');
      const data = await res.json();
      if (data.success) {
        setPendingDoctors(data.data);
      }
    } catch (e) {
      console.warn('Could not fetch pending doctors:', e);
    }
  };

  useEffect(() => {
    fetchPendingDoctors();
  }, []);

  const handleApproveDoctor = async (doctorId: string) => {
    setVerifyingDoctorId(doctorId);
    try {
      const res = await fetch(`/api/staff/doctors/${doctorId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: 'Dr. Sarah Jenkins (Staff)' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Doctor credentials verified and activated successfully!');
        fetchPendingDoctors();
        onRefreshData();
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  const handleRejectDoctor = async (doctorId: string) => {
    const reason = prompt('Please enter reason for rejecting physician credentials:', 'Could not verify state license number.');
    if (!reason) return;
    setVerifyingDoctorId(doctorId);
    try {
      const res = await fetch(`/api/staff/doctors/${doctorId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Physician application rejected.');
        fetchPendingDoctors();
        onRefreshData();
      }
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  // Compute stats
  const totalPatients = patients.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayStr || a.status === 'CONFIRMED').length;
  const emergencyCases = triageHistory.filter((t) => t.urgency === 'RED').length;
  const urgentCases = triageHistory.filter((t) => t.urgency === 'ORANGE').length;
  const routineCases = triageHistory.filter((t) => t.urgency === 'GREEN').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;
  const availableDoctors = doctors.filter((d) => d.status === 'ACTIVE').length;
  const cancelledAppointments = appointments.filter((a) => a.status === 'CANCELLED').length;
  const rebookedAppointments = appointments.filter((a) => a.status === 'REBOOKED').length;
  const sentEmails = emailNotifications.filter((e) => e.status === 'SENT').length;
  const totalEmails = emailNotifications.length;

  // Resolve Human Approval
  const handleResolveApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/approvals/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          staffName: 'Dr. Sarah Jenkins (Lead Physician)',
          notes: status === 'APPROVED' ? 'Approved by clinical staff. Proceeding with urgent scheduling.' : 'Declined by clinical staff.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Error resolving approval:', err);
    } finally {
      setResolvingId(null);
    }
  };

  // Trigger Doctor Schedule Cancellation Demo
  const handleDoctorCancellationDemo = async (doctorId: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    if (!confirm(`Simulate emergency leave for ${doc?.name}? This will identify affected appointments and trigger automatic authorized rebooking.`)) return;

    // Find any appointment for this doctor
    const affected = appointments.find((a) => a.doctorId === doctorId && a.status === 'CONFIRMED');
    if (!affected) {
      alert(`No confirmed appointments found for ${doc?.name} to cancel.`);
      return;
    }

    try {
      const res = await fetch(`/api/appointments/${affected.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Doctor emergency surgical on-call for ${doc?.name}` }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Appointment ${affected.bookingId} cancelled. Navigating to Rebooking Management.`);
        setActiveSection('rebooking');
        onRefreshData();
      }
    } catch (err: any) {
      alert(`Error cancelling doctor appointment: ${err.message}`);
    }
  };

  // Retry failed email
  const handleRetryEmail = async (id: string) => {
    setRetryingEmailId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Email dispatch retry attempted.');
        onRefreshData();
      }
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingEmailId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Staff Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-slate-800 text-white font-bold px-2 py-0.5 rounded-full">
              CLINICAL STAFF DASHBOARD
            </span>
            <span className="text-xs text-slate-500">PulseCare Medical Center</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Clinical Operations & Human-in-the-Loop Oversight
          </h1>
        </div>

        <button
          onClick={onRefreshData}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Operations Data</span>
        </button>
      </div>

      {/* 10 Operational Metric Cards Required by Prompt */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Patients */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Patients</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalPatients}</div>
          <span className="text-[10px] text-teal-600 font-medium">Firestore Memory</span>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Appointments</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700 mt-1">{todayAppointments}</div>
          <span className="text-[10px] text-slate-500 font-medium">Calendar REST API</span>
        </div>

        {/* Emergency Cases */}
        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/30 shadow-xs">
          <div className="flex items-center justify-between text-red-600 text-xs font-semibold">
            <span>Emergency (RED)</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">{emergencyCases}</div>
          <span className="text-[10px] text-red-600 font-medium">Auto-escalated</span>
        </div>

        {/* Urgent Cases */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Urgent (ORANGE)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{urgentCases}</div>
          <span className="text-[10px] text-amber-700 font-medium">Fast-track queue</span>
        </div>

        {/* Routine Cases */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Routine (GREEN)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{routineCases}</div>
          <span className="text-[10px] text-emerald-700 font-medium">Standard routing</span>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{pendingApprovals}</div>
          <span className="text-[10px] text-purple-600 font-medium">Human-in-the-loop</span>
        </div>

        {/* Available Doctors */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Available Doctors</span>
            <Stethoscope className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{availableDoctors}/6</div>
          <span className="text-[10px] text-blue-600 font-medium">Active duty</span>
        </div>

        {/* Cancelled */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Cancelled</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{cancelledAppointments}</div>
          <span className="text-[10px] text-slate-500 font-medium">Slots released</span>
        </div>

        {/* Rebooked */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Rebooked</span>
            <RefreshCw className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{rebookedAppointments}</div>
          <span className="text-[10px] text-indigo-600 font-medium">Authorized by patient</span>
        </div>

        {/* Email Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Email Delivery</span>
            <Mail className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{sentEmails}/{totalEmails}</div>
          <span className="text-[10px] text-cyan-600 font-medium">Resend Provider</span>
        </div>
      </div>

      {/* Staff Section Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'overview' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview & Queue
          </button>
          <button
            onClick={() => setActiveSection('triage-queue')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'triage-queue' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Triage Queue ({triageHistory.length})
          </button>
          <button
            onClick={() => setActiveSection('emergency-alerts')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'emergency-alerts' ? 'bg-red-600 text-white shadow-xs' : 'text-red-700 hover:bg-red-50'
            }`}
          >
            🚨 Emergency Alerts ({emergencyCases})
          </button>
          <button
            onClick={() => setActiveSection('human-approvals')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'human-approvals' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approvals Queue ({pendingApprovals})
          </button>
          <button
            onClick={() => setActiveSection('appointments')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'appointments' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveSection('doctors')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'doctors' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Doctor Schedules ({doctors.length})
          </button>
          <button
            onClick={() => setActiveSection('doctor-verifications')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              activeSection === 'doctor-verifications'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Doctor Verifications ({pendingDoctors.length})</span>
          </button>
          <button
            onClick={() => setActiveSection('rebooking')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'rebooking' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rebooking Management ({rebookingRequests.length})
          </button>
          <button
            onClick={() => setActiveSection('emails')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'emails' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Email Logs ({emailNotifications.length})
          </button>
          <button
            onClick={() => setActiveSection('patients')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeSection === 'patients' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient Records ({patients.length})
          </button>
          <button
            onClick={() => setActiveSection('csv-import')}
            className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 font-bold ${
              activeSection === 'csv-import'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Data Import</span>
          </button>
        </div>

        {/* Section Contents */}
        <div className="p-5">
          {/* SECTION 1: OVERVIEW & PENDING QUEUE */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emergency & Urgent Cases */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>Priority Clinical Triage Queue</span>
                  <span className="text-xs text-slate-500 font-normal">Real-time alerts</span>
                </h3>

                <div className="space-y-2.5">
                  {triageHistory.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border text-xs flex justify-between items-start ${
                        t.urgency === 'RED'
                          ? 'bg-red-50 border-red-200 text-red-950'
                          : t.urgency === 'ORANGE'
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              t.urgency === 'RED'
                                ? 'bg-red-600 text-white'
                                : t.urgency === 'ORANGE'
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {t.urgency}
                          </span>
                          <span className="font-semibold text-slate-800">
                            Chief Complaint: {t.primaryComplaint}
                          </span>
                        </div>
                        <p className="text-slate-600">{t.clinicalRationale}</p>
                        <p className="text-[11px] text-slate-400">
                          Routed to: <strong>{t.recommendedSpecialty}</strong> • {new Date(t.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Human Approvals Queue */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>Human-in-the-Loop Approvals</span>
                  <span className="text-xs text-purple-700 font-semibold">{pendingApprovals} pending</span>
                </h3>

                {approvals.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No pending approvals.</p>
                ) : (
                  <div className="space-y-2.5">
                    {approvals.map((appr) => (
                      <div
                        key={appr.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800">{appr.patientName}</span>
                            <span className="text-slate-400 block text-[11px]">{appr.type}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              appr.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : appr.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {appr.status}
                          </span>
                        </div>
                        <p className="text-slate-600">{appr.details}</p>
                        <p className="text-teal-700 font-medium">Proposed: {appr.proposedAction}</p>

                        {appr.status === 'PENDING' && (
                          <div className="flex space-x-2 pt-1 border-t border-slate-200/80">
                            <button
                              onClick={() => handleResolveApproval(appr.id, 'APPROVED')}
                              disabled={resolvingId === appr.id}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                            >
                              Approve Action
                            </button>
                            <button
                              onClick={() => handleResolveApproval(appr.id, 'REJECTED')}
                              disabled={resolvingId === appr.id}
                              className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: EMERGENCY ALERTS */}
          {activeSection === 'emergency-alerts' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-900">
                <strong>Emergency Triage Protocol Active:</strong> Emergency red flags immediately suspend automated booking, alert clinical staff, and advise 911 dispatch without waiting for approval.
              </div>

              {triageHistory.filter((t) => t.urgency === 'RED').length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No active RED emergency alerts logged.
                </div>
              ) : (
                triageHistory
                  .filter((t) => t.urgency === 'RED')
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border-2 border-red-500 bg-red-50/50 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-red-900 text-sm">
                          EMERGENCY ALERT: {t.redFlagAnalysis.category.toUpperCase()}
                        </span>
                        <span className="text-slate-500">{new Date(t.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-red-950 font-medium">Patient Complaint: "{t.primaryComplaint}"</p>
                      <p className="text-slate-700">{t.clinicalRationale}</p>
                      <div className="flex items-center space-x-2 text-xs text-red-700 font-semibold pt-1">
                        <span>Action: Emergency Department / 911 Advisory active</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* SECTION 3: APPOINTMENTS */}
          {activeSection === 'appointments' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                      <th className="py-2.5 px-3">Booking ID</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Doctor</th>
                      <th className="py-2.5 px-3">Specialty</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Urgency</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{apt.bookingId}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{apt.patientName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{apt.doctorName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{apt.doctorSpecialty}</td>
                        <td className="py-2.5 px-3 text-slate-800">{apt.date} at {apt.time}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              apt.urgency === 'RED'
                                ? 'bg-red-100 text-red-800'
                                : apt.urgency === 'ORANGE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {apt.urgency}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              apt.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : apt.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 4: DOCTOR MANAGEMENT & CALENDAR */}
          {activeSection === 'doctors' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Staff can simulate doctor emergency leave to test automatic cancellation detection and authorized rebooking.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={doc.avatarUrl}
                        alt={doc.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{doc.name}</h4>
                        <span className="text-[11px] text-teal-700 font-semibold">{doc.specialty}</span>
                        <p className="text-[10px] text-slate-500">{doc.qualifications}</p>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg">
                      <p><strong>Days:</strong> {doc.availableDays.join(', ')}</p>
                      <p><strong>Hours:</strong> {doc.workingHours.start} - {doc.workingHours.end} ({doc.slotDurationMinutes} min)</p>
                      <p><strong>Room:</strong> {doc.roomNumber}</p>
                    </div>

                    <button
                      onClick={() => handleDoctorCancellationDemo(doc.id)}
                      className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Simulate Leave & Rebook Queue
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: DOCTOR VERIFICATIONS (Requirement 8) */}
          {activeSection === 'doctor-verifications' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Physician Credentialing & License Verification Queue
                    </h3>
                    <p className="text-xs text-amber-800">
                      Requirement 8: New physicians who register through the Doctor Portal are placed in <strong>PENDING_VERIFICATION</strong> status.
                      Staff must verify their medical credentials before their calendar and intake routing are activated.
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchPendingDoctors}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {pendingDoctors.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-800">All Registered Physicians Are Verified</p>
                  <p className="text-xs text-slate-500 mt-1">No doctor registrations currently pending staff review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingDoctors.map((doc) => (
                    <div
                      key={doc.uid}
                      className="p-5 rounded-2xl border-2 border-amber-200 bg-white shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold text-base">
                            <Stethoscope className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{doc.displayName}</h4>
                            <span className="text-xs text-teal-700 font-semibold">{doc.specialization}</span>
                            <span className="block text-[11px] text-slate-400 font-mono">ID: {doc.uid}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          PENDING_VERIFICATION
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">State Medical License:</span>
                          <span className="font-mono font-bold text-teal-800">{doc.licenseNumber || 'PENDING'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Qualifications:</span>
                          <span className="font-semibold text-slate-700">{doc.qualification}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Clinical Experience:</span>
                          <span className="text-slate-700">{doc.experience}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Contact Email:</span>
                          <span className="text-slate-700">{doc.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Mobile Phone:</span>
                          <span className="text-slate-700">{doc.phone || 'On file'}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 pt-2">
                        <button
                          onClick={() => handleApproveDoctor(doc.uid)}
                          disabled={verifyingDoctorId === doc.uid}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verify & Activate Doctor</span>
                        </button>
                        <button
                          onClick={() => handleRejectDoctor(doc.uid)}
                          disabled={verifyingDoctorId === doc.uid}
                          className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: REBOOKING MANAGEMENT */}
          {activeSection === 'rebooking' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Doctor Cancellation & Authorized Rebooking Audit
              </h3>

              {rebookingRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No cancellation rebooking requests recorded yet. Use the Doctor Schedules tab to trigger a cancellation demo.
                </div>
              ) : (
                <div className="space-y-3">
                  {rebookingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 text-xs space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-950">
                          Rebooking Request: Original {req.originalBookingId}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-900">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-slate-700">Patient: <strong>{req.patientName}</strong> ({req.patientEmail})</p>
                      <p className="text-slate-600">Cancelled Doctor: {req.cancelledDoctorName} ({req.specialty})</p>
                      <p className="text-slate-600">Reason: {req.cancellationReason}</p>
                      {req.proposedSlot && (
                        <p className="text-indigo-800 font-semibold">
                          Replacement Slot: {req.proposedSlot.doctorName} on {req.proposedSlot.date} at {req.proposedSlot.time} (New ID: {req.newBookingId})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: EMAIL NOTIFICATIONS */}
          {activeSection === 'emails' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">
                  Transactional Email Delivery Audit (Resend API)
                </h3>
                <span className="text-xs text-slate-500">Idempotent dispatch</span>
              </div>

              {emailNotifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No email logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {emailNotifications.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex justify-between items-center"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : e.status === 'NOT_CONNECTED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {e.status}
                          </span>
                          <span className="font-semibold text-slate-900">{e.subject}</span>
                        </div>
                        <p className="text-slate-500">
                          Recipient: {e.recipientEmail} • Booking Ref: {e.bookingId} • Key: {e.idempotencyKey.substring(0, 16)}...
                        </p>
                        {e.error && <p className="text-red-600 text-[11px]">{e.error}</p>}
                      </div>

                      {e.status !== 'SENT' && (
                        <button
                          onClick={() => handleRetryEmail(e.id)}
                          disabled={retryingEmailId === e.id}
                          className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg shadow-2xs"
                        >
                          {retryingEmailId === e.id ? 'Retrying...' : 'Retry Dispatch'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 7: PATIENT RECORDS */}
          {activeSection === 'patients' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Firestore Patient Memory Directory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {patients.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">{p.fullName}</h4>
                        <span className="text-slate-500">{p.email} • {p.phone}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {p.isReturning ? 'Returning Patient' : 'New Patient'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-slate-700">
                      <p><strong>Allergies:</strong> <span className="text-red-600 font-semibold">{p.medicalHistory.allergies.join(', ') || 'None'}</span></p>
                      <p><strong>Medications:</strong> {p.medicalHistory.currentMedications.join(', ') || 'None'}</p>
                      <p><strong>Conditions:</strong> {p.medicalHistory.chronicConditions.join(', ') || 'None'}</p>
                      <p className="text-[11px] text-slate-400">Total Visits: {p.medicalHistory.previousVisitsCount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 8: TRIAGE QUEUE */}
          {activeSection === 'triage-queue' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Complete Clinical Triage Assessment Audit
              </h3>
              <div className="space-y-2">
                {triageHistory.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.urgency === 'RED'
                              ? 'bg-red-100 text-red-800'
                              : t.urgency === 'ORANGE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {t.urgency}
                        </span>
                        <span className="font-bold text-slate-900">Complaint: {t.primaryComplaint}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{new Date(t.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600">{t.clinicalRationale}</p>
                    <p className="text-teal-700 font-medium">Assigned Specialty: {t.recommendedSpecialty}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 9: HUMAN APPROVALS QUEUE */}
          {activeSection === 'human-approvals' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Human-in-the-Loop Clinical Approvals
              </h3>
              <div className="space-y-2.5">
                {approvals.map((appr) => (
                  <div
                    key={appr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800">{appr.patientName}</span>
                        <span className="text-slate-400 block text-[11px]">{appr.type}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appr.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : appr.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {appr.status}
                      </span>
                    </div>
                    <p className="text-slate-600">{appr.details}</p>
                    <p className="text-teal-700 font-medium">Proposed Action: {appr.proposedAction}</p>

                    {appr.status === 'PENDING' && (
                      <div className="flex space-x-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleResolveApproval(appr.id, 'APPROVED')}
                          disabled={resolvingId === appr.id}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Approve Urgent Schedule
                        </button>
                        <button
                          onClick={() => handleResolveApproval(appr.id, 'REJECTED')}
                          disabled={resolvingId === appr.id}
                          className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                        >
                          Decline Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: SECURE CSV DATA IMPORT */}
          {activeSection === 'csv-import' && (
            <CsvDataImportView
              onRefreshParentData={onRefreshData}
              currentUserRole={currentUserRole}
            />
          )}
        </div>
      </div>
    </div>
  );
};
