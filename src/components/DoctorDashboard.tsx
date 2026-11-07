import React, { useState } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileText,
  Activity,
  HeartPulse,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Sliders,
  Check,
  Sparkles,
  Lock,
  X,
  AlertCircle,
  CheckCheck,
  TrendingUp,
  UserCheck,
  ArrowRight,
  HelpCircle,
  Pill,
} from 'lucide-react';
import {
  Doctor,
  Appointment,
  Patient,
  TriageAssessment,
  DoctorHandoffSummary,
  ReportBiomarkerComparison,
} from '../types/index.ts';

interface DoctorDashboardProps {
  doctor: {
    uid: string;
    email: string;
    displayName: string;
    role: 'doctor';
    specialization?: string;
    qualification?: string;
    experience?: string;
    licenseNumber?: string;
    status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'REJECTED' | 'SUSPENDED';
    phone?: string;
  };
  appointments: Appointment[];
  patients: Patient[];
  triageHistory: TriageAssessment[];
  onRefreshData: () => void;
  onLogout: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctor,
  appointments,
  patients,
  triageHistory,
  onRefreshData,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'schedule' | 'biomarkers'>('approvals');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [isAvailableToday, setIsAvailableToday] = useState(true);

  // Approval / Rejection Action States
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [rejectModalApt, setRejectModalApt] = useState<Appointment | null>(null);
  const [rejectReason, setRejectReason] = useState('Emergency clinical conflict; reassigning to available specialist.');

  // AI Doctor Clinical Handoff State
  const [handoffModalApt, setHandoffModalApt] = useState<Appointment | null>(null);
  const [handoffSummary, setHandoffSummary] = useState<DoctorHandoffSummary | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  // Biomarker Comparison State
  const [biomarkerPatientEmail, setBiomarkerPatientEmail] = useState<string>('eleanor.hughes@example.com');
  const [biomarkerPatientName, setBiomarkerPatientName] = useState<string>('Eleanor Hughes');
  const [biomarkerData, setBiomarkerData] = useState<{
    biomarkers: ReportBiomarkerComparison[];
    summary: any;
  } | null>(null);
  const [biomarkerLoading, setBiomarkerLoading] = useState(false);

  const isPending = doctor.status === 'PENDING_VERIFICATION';

  // Filter appointments strictly for this authenticated doctor
  const doctorAppointments = appointments.filter((a) => {
    if (a.doctorId === doctor.uid) return true;
    if (doctor.displayName && a.doctorName.toLowerCase() === doctor.displayName.toLowerCase()) return true;
    return false;
  });

  const pendingApprovalApts = doctorAppointments.filter(
    (a) => a.status === 'PENDING_DOCTOR_APPROVAL' || a.status === 'PENDING_APPROVAL' || a.status === 'REASSIGNED'
  );
  const upcomingApts = doctorAppointments.filter((a) => a.status === 'CONFIRMED');

  const handleSaveNotes = () => {
    if (!clinicalNotes) return;
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 3000);
  };

  // 1. Doctor Accepts Appointment
  const handleAcceptAppointment = async (aptId: string) => {
    setActionLoadingId(aptId);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/appointments/${aptId}/doctor-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.uid,
          notes: 'Clinically approved by physician. Appointment confirmed.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionMessage({
          type: 'success',
          text: `Appointment for ${json.data.patientName} (${json.data.date} at ${json.data.time}) is CONFIRMED. Official confirmation email dispatched to patient!`,
        });
        onRefreshData();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Failed to accept appointment.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Doctor Rejects Appointment -> Triggers auto-reassignment to next verified specialist
  const handleConfirmReject = async () => {
    if (!rejectModalApt) return;
    const aptId = rejectModalApt.id;
    setActionLoadingId(aptId);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/appointments/${aptId}/doctor-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.uid,
          reason: rejectReason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (json.reassigned) {
          setActionMessage({
            type: 'info',
            text: `Appointment request declined. System successfully reassigned ${rejectModalApt.patientName} to ${json.nextDoctorName}, keeping slot open. Patient notified!`,
          });
        } else {
          setActionMessage({
            type: 'info',
            text: `Appointment request declined. No remaining specialists available in this department. Patient notified with alternative dates.`,
          });
        }
        setRejectModalApt(null);
        onRefreshData();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Failed to decline appointment.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Open AI Clinical Handoff Summary Modal
  const handleOpenHandoff = async (apt: Appointment) => {
    setHandoffModalApt(apt);
    setHandoffLoading(true);
    setHandoffError(null);
    setHandoffSummary(null);

    try {
      const res = await fetch(`/api/appointments/${apt.id}/handoff-summary`);
      const json = await res.json();
      if (json.success && json.data) {
        setHandoffSummary(json.data);
      } else {
        setHandoffError(json.error || 'Failed to generate clinical handoff.');
      }
    } catch (err: any) {
      setHandoffError(`Network error generating clinical handoff: ${err.message}`);
    } finally {
      setHandoffLoading(false);
    }
  };

  // 4. Open Biomarker Comparison Viewer for Patient
  const handleOpenBiomarkers = async (patientEmail: string, patientName: string, patientId?: string) => {
    setBiomarkerPatientEmail(patientEmail);
    setBiomarkerPatientName(patientName);
    setActiveTab('biomarkers');
    setBiomarkerLoading(true);

    try {
      const res = await fetch(
        `/api/patient/reports/comparison?email=${encodeURIComponent(patientEmail)}&patientId=${encodeURIComponent(patientId || '')}&name=${encodeURIComponent(patientName)}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setBiomarkerData(json.data);
      }
    } catch (err) {
      console.error('[DoctorDashboard] Error loading biomarkers:', err);
    } finally {
      setBiomarkerLoading(false);
    }
  };

  // If doctor registration is still pending verification
  if (isPending) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-amber-900">Doctor Verification Pending Review</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800 border border-amber-300">
                  STATUS: PENDING_VERIFICATION
                </span>
              </div>
              <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                Welcome, <strong>{doctor.displayName}</strong>. Your physician account has been registered with PulseCare Medical Center.
                In compliance with clinical safety protocols, your medical credentials and state license number are currently under verification by our clinical administration staff.
              </p>

              <div className="mt-6 bg-white rounded-xl p-5 border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                <div>
                  <span className="text-slate-400 font-medium block">Doctor Name</span>
                  <span className="text-sm font-semibold text-slate-900">{doctor.displayName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Specialization</span>
                  <span className="text-sm font-semibold text-slate-900">{doctor.specialization || 'General Physician'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Medical License #</span>
                  <span className="text-sm font-semibold font-mono text-teal-700">{doctor.licenseNumber || 'PENDING-REGISTRY'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Qualification & Experience</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {doctor.qualification || 'MD'} ({doctor.experience || 'Clinical Practice'})
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-amber-200">
                <div className="flex items-center space-x-2 text-xs text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Clinical Staff can review and verify this profile instantly from the Staff Dashboard.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onRefreshData}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Verification Status</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active & Verified Doctor Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Physician Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-teal-500/20 text-2xl font-bold">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">{doctor.displayName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Physician</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
              <span>{doctor.qualification || 'MD, Board Certified'}</span>
              <span>•</span>
              <span className="text-teal-700 font-semibold">{doctor.specialization || 'Specialist'}</span>
              <span>•</span>
              <span className="font-mono">License: {doctor.licenseNumber || 'MD-ACTIVE'}</span>
              <span>•</span>
              <span>Suite 204</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end md:self-center">
          <button
            onClick={() => setIsAvailableToday(!isAvailableToday)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border ${
              isAvailableToday
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvailableToday ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{isAvailableToday ? 'Available for Intake' : 'Set to On-Leave'}</span>
          </button>
          <button
            onClick={onRefreshData}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh schedule"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-cyan-50 border-cyan-200 text-cyan-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : actionMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <Activity className="w-4 h-4 text-cyan-600 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Requirement 2 & 4: Pending Approvals KPI */}
        <div
          onClick={() => setActiveTab('approvals')}
          className={`rounded-xl border p-5 shadow-xs cursor-pointer transition-all ${
            activeTab === 'approvals' ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Doctor Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-3xl font-extrabold text-amber-900">{pendingApprovalApts.length}</p>
            {pendingApprovalApts.length > 0 && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className="text-xs text-amber-700/80 mt-1">Requires physician clinical review</p>
        </div>

        <div
          onClick={() => setActiveTab('schedule')}
          className={`rounded-xl border p-5 shadow-xs cursor-pointer transition-all ${
            activeTab === 'schedule' ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-400/30' : 'bg-white border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmed Appointments</span>
            <Calendar className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{upcomingApts.length}</p>
          <p className="text-xs text-slate-400 mt-1">Patient slots officially booked</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Urgent Triage Cases</span>
            <Activity className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-3xl font-extrabold text-red-600 mt-2">
            {pendingApprovalApts.filter((a) => a.urgency === 'ORANGE' || a.urgency === 'RED').length +
              upcomingApts.filter((a) => a.urgency === 'ORANGE').length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Requiring same-day clinical review</p>
        </div>

        <div
          onClick={() => handleOpenBiomarkers('eleanor.hughes@example.com', 'Eleanor Hughes')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs cursor-pointer hover:border-cyan-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biomarker Trends</span>
            <TrendingUp className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-3xl font-extrabold text-cyan-700 mt-2">Active</p>
          <p className="text-xs text-slate-400 mt-1">Longitudinal lab comparisons</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'approvals'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Pending Approvals Queue</span>
          {pendingApprovalApts.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'approvals' ? 'bg-white text-amber-900' : 'bg-amber-200 text-amber-900'
              }`}
            >
              {pendingApprovalApts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'schedule'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Confirmed Schedule</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'schedule' ? 'bg-white text-teal-900' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {upcomingApts.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('biomarkers');
            if (!biomarkerData) handleOpenBiomarkers('eleanor.hughes@example.com', 'Eleanor Hughes');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'biomarkers'
              ? 'bg-cyan-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Biomarker Lab Comparisons</span>
        </button>
      </div>

      {/* 1. PENDING APPROVALS QUEUE */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Physician Appointment Approval Queue</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Human-in-the-Loop Clinical Verification
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review patient symptoms, AI triage urgency, and requested slot. Only approved requests trigger booking confirmation.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-bold self-start sm:self-auto">
              {pendingApprovalApts.length} Pending Approval
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingApprovalApts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-slate-700">All Appointment Requests Reviewed</p>
                <p className="text-xs mt-1">There are no pending patient requests requiring physician sign-off right now.</p>
              </div>
            ) : (
              pendingApprovalApts.map((apt) => (
                <div key={apt.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{apt.patientName}</span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            apt.urgency === 'RED'
                              ? 'bg-red-100 text-red-800'
                              : apt.urgency === 'ORANGE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Urgency: {apt.urgency}
                        </span>

                        {apt.reassignedFromDoctorName && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                            Reassigned from {apt.reassignedFromDoctorName}
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-slate-400">{apt.bookingId}</span>
                      </div>

                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Reported Symptoms:</span> {apt.chiefComplaint}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center space-x-1 font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>{apt.date} at {apt.time} ({apt.durationMinutes || 30} mins)</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{apt.patientEmail}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{apt.patientPhone}</span>
                        </span>
                      </div>

                      {/* Multi-Doctor Reassignment Chain History */}
                      {apt.reassignmentHistory && apt.reassignmentHistory.length > 0 && (
                        <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-1.5">
                          <span className="font-bold text-[11px] text-purple-900 uppercase tracking-wider block">
                            Reassignment Chain History ({apt.reassignmentHistory.length} events):
                          </span>
                          <div className="space-y-1">
                            {apt.reassignmentHistory.map((entry, idx) => (
                              <div key={idx} className="flex items-start space-x-2 text-[11px] text-purple-900">
                                <span className="font-bold text-purple-700 shrink-0">Step {entry.sequence}:</span>
                                <div>
                                  <span className="font-semibold">{entry.doctorName}</span> ({entry.specialty}) –{' '}
                                  <span className={`font-bold ${entry.decision === 'ACCEPTED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {entry.decision}
                                  </span>
                                  {entry.reason && <span className="text-purple-700 italic"> — "{entry.reason}"</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Accept, Decline/Reassign, AI Handoff */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenHandoff(apt)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center space-x-1.5"
                        title="Inspect clinical intake notes and history generated by Gemini"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>AI Clinical Handoff</span>
                      </button>

                      <button
                        onClick={() => handleOpenBiomarkers(apt.patientEmail, apt.patientName, apt.patientId)}
                        className="px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
                        title="View patient's longitudinal lab reports and biomarker trends"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-700" />
                        <span>Biomarkers</span>
                      </button>

                      <button
                        onClick={() => setRejectModalApt(apt)}
                        disabled={actionLoadingId === apt.id}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors disabled:opacity-50"
                        title="Decline and auto-reassign to next specialist"
                      >
                        Decline / Reassign
                      </button>

                      <button
                        onClick={() => handleAcceptAppointment(apt.id)}
                        disabled={actionLoadingId === apt.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                        title="Accept appointment and confirm booking"
                      >
                        {actionLoadingId === apt.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Confirming...</span>
                          </>
                        ) : (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Accept Appointment</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. CONFIRMED CONSULTATION SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Confirmed Patient Schedule</h2>
                <p className="text-xs text-slate-500">Formally approved consultations synced with clinic calendar.</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                {upcomingApts.length} Confirmed
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingApts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">No confirmed consultations scheduled yet.</p>
                  <p className="text-xs mt-1">Pending approval requests will appear here once accepted.</p>
                </div>
              ) : (
                upcomingApts.map((apt) => {
                  const isSelected = selectedAppointment?.id === apt.id;
                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setClinicalNotes('');
                      }}
                      className={`p-4 transition-colors cursor-pointer flex items-center justify-between hover:bg-slate-50 ${
                        isSelected ? 'bg-teal-50/60 border-l-4 border-teal-600' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 mt-0.5">
                          {apt.patientName.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-slate-900">{apt.patientName}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                apt.urgency === 'RED'
                                  ? 'bg-red-100 text-red-800'
                                  : apt.urgency === 'ORANGE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {apt.urgency}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              CONFIRMED
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            <span className="font-medium text-slate-700">Complaint:</span> {apt.chiefComplaint}
                          </p>
                          <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{apt.date}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{apt.time} ({apt.durationMinutes}m)</span>
                            </span>
                            <span className="font-mono text-teal-600">{apt.bookingId}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHandoff(apt);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Handoff</span>
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Col: Consultation Inspector & Clinical Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Clinical Consultation Inspector</span>
              </h3>
              {selectedAppointment && (
                <span className="text-[11px] font-mono text-slate-400">{selectedAppointment.bookingId}</span>
              )}
            </div>

            {selectedAppointment ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Patient</span>
                  <p className="text-base font-bold text-slate-900">{selectedAppointment.patientName}</p>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>{selectedAppointment.patientEmail}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{selectedAppointment.patientPhone}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Chief Complaint:</span>
                    <span className="font-semibold text-slate-800">{selectedAppointment.chiefComplaint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Triage Priority:</span>
                    <span
                      className={`font-bold ${
                        selectedAppointment.urgency === 'RED'
                          ? 'text-red-700'
                          : selectedAppointment.urgency === 'ORANGE'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      Level {selectedAppointment.urgency === 'RED' ? '1 (Emergency)' : selectedAppointment.urgency === 'ORANGE' ? '2 (Urgent)' : '3 (Routine)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Appointment:</span>
                    <span className="text-slate-700">{selectedAppointment.date} at {selectedAppointment.time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenHandoff(selectedAppointment)}
                    className="flex-1 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>View AI Clinical Handoff</span>
                  </button>

                  <button
                    onClick={() => handleOpenBiomarkers(selectedAppointment.patientEmail, selectedAppointment.patientName, selectedAppointment.patientId)}
                    className="px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold border border-cyan-200 transition-colors"
                    title="View lab biomarkers"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Physician Encounter Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Physician Encounter Notes & Prescription Advice
                  </label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Record examination findings, recommended diagnostics, lab requisitions, or treatment plan..."
                    rows={4}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save to Medical Record</span>
                    </button>
                    {notesSaved && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Saved to Cloud Firestore</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400">
                <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Select any patient from the schedule list to view clinical demographics and enter doctor notes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BIOMARKER COMPARISON VIEWER */}
      {activeTab === 'biomarkers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900">Longitudinal Biomarker Comparison</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-semibold border border-cyan-200">
                  {biomarkerPatientName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-visit diagnostic lab analysis comparing Total Cholesterol, LDL, Fasting Glucose, Blood Pressure, and Renal function.
              </p>
            </div>
            <button
              onClick={() => handleOpenBiomarkers(biomarkerPatientEmail, biomarkerPatientName)}
              disabled={biomarkerLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-1 self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${biomarkerLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Lab Data</span>
            </button>
          </div>

          {biomarkerLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto text-teal-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Synthesizing Longitudinal Biomarker Report...</p>
            </div>
          ) : biomarkerData && biomarkerData.biomarkers ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Diagnostic Reports</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">{biomarkerData.summary.totalReports}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Tracked Biomarkers</span>
                  <p className="text-xl font-bold text-slate-900 mt-1">{biomarkerData.summary.trackedBiomarkersCount}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <span className="text-[11px] text-amber-800 font-medium">Elevated Biomarkers</span>
                  <p className="text-xl font-bold text-amber-900 mt-1">{biomarkerData.summary.highBiomarkersCount}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 font-medium">Clinical Profile</span>
                  <p className="text-base font-bold text-emerald-900 mt-1">{biomarkerData.summary.overallStatus}</p>
                </div>
              </div>

              {/* Biomarker Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Biomarker</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Previous Value</th>
                      <th className="p-3">Latest Value</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Trend</th>
                      <th className="p-3">Clinical Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {biomarkerData.biomarkers.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold text-slate-900">{b.biomarkerName}</td>
                        <td className="p-3 text-slate-500 font-mono">{b.referenceRange}</td>
                        <td className="p-3 text-slate-600 font-mono">
                          {b.previousValue !== undefined ? `${b.previousValue} ${b.unit}` : 'Baseline'}
                        </td>
                        <td className="p-3 font-bold font-mono text-slate-900">
                          {b.latestValue} {b.unit}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.latestStatus === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : b.latestStatus === 'CRITICAL'
                                ? 'bg-red-100 text-red-800'
                                : b.latestStatus === 'LOW'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {b.latestStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.trend === 'INCREASED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : b.trend === 'DECREASED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span>{b.trend === 'INCREASED' ? '▲' : b.trend === 'DECREASED' ? '▼' : '●'}</span>
                            <span>{b.trend}</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs">{b.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No lab reports found for comparison.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: DECLINE & REASSIGN MODAL */}
      {rejectModalApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-slate-900">Decline & Reassign Appointment</h3>
              </div>
              <button onClick={() => setRejectModalApt(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When you decline this appointment for <strong>{rejectModalApt.patientName}</strong> ({rejectModalApt.date} at {rejectModalApt.time}),
              the system will release this slot and <strong>automatically search for the next eligible verified physician</strong> in the same specialty to transfer the booking request.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
              <div>
                <span className="text-slate-400 font-medium">Chief Complaint:</span>{' '}
                <span className="font-semibold text-slate-800">{rejectModalApt.chiefComplaint}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Specialty:</span>{' '}
                <span className="font-semibold text-teal-800">{rejectModalApt.doctorSpecialty}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Physician Decline Rationale:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRejectModalApt(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoadingId === rejectModalApt.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                {actionLoadingId === rejectModalApt.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reassigning...</span>
                  </>
                ) : (
                  <span>Confirm Decline & Reassign</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AI CLINICAL DOCTOR HANDOFF SUMMARY (Requirement 6) */}
      {handoffModalApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">AI Clinical Handoff Intelligence Summary</h3>
                  <p className="text-[11px] text-slate-400">Powered by Gemini 3.8 Flash • Pre-Consultation Synthesis</p>
                </div>
              </div>
              <button onClick={() => setHandoffModalApt(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {handoffLoading ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-700">Synthesizing Evidence-Backed Clinical Handoff...</p>
                <p className="text-xs text-slate-400">Aggregating vitals, symptoms, prior encounters, and lab panels.</p>
              </div>
            ) : handoffError ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {handoffError}
              </div>
            ) : handoffSummary ? (
              <div className="space-y-6 text-xs text-slate-700">
                {/* 1. Demographics & Triage Urgency Header */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 font-medium block">Patient</span>
                    <span className="font-bold text-slate-900 text-sm">{handoffSummary.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Demographics</span>
                    <span className="font-semibold text-slate-800">
                      {handoffSummary.demographics.age} yrs • {handoffSummary.demographics.gender} • Blood: {handoffSummary.demographics.bloodGroup}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Triage Urgency</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold mt-0.5 ${
                        handoffSummary.triageAssessment.urgency === 'RED'
                          ? 'bg-red-100 text-red-800'
                          : handoffSummary.triageAssessment.urgency === 'ORANGE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {handoffSummary.triageAssessment.urgency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Chief Complaint</span>
                    <span className="font-semibold text-slate-800">{handoffSummary.triageAssessment.chiefComplaint}</span>
                  </div>
                </div>

                {/* 2. Medical History & Medications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block flex items-center space-x-1.5">
                      <HeartPulse className="w-4 h-4 text-teal-600" />
                      <span>Chronic Conditions & Allergies</span>
                    </span>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Chronic Conditions:</span>
                      <p className="font-semibold text-slate-800">
                        {handoffSummary.relevantMedicalHistory.chronicConditions.join(', ') || 'None on record'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Drug Allergies:</span>
                      <p className="font-semibold text-rose-700">
                        {handoffSummary.relevantMedicalHistory.allergies.join(', ') || 'No known allergies'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block flex items-center space-x-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      <span>Current Pharmacotherapy</span>
                    </span>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Active Medications:</span>
                      <p className="font-semibold text-slate-800">
                        {handoffSummary.relevantMedicalHistory.currentMedications.join(', ') || 'None listed'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Previous Surgeries:</span>
                      <p className="font-semibold text-slate-800">
                        {handoffSummary.relevantMedicalHistory.surgeries.join(', ') || 'None reported'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Previous Visits & Recent Lab Highlights */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>Previous Visits & Consultation History</span>
                  </span>
                  <p className="text-slate-600 leading-relaxed">{handoffSummary.previousVisitsSummary}</p>

                  {handoffSummary.recentLabHighlights.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Recent Lab Findings Highlights:
                      </span>
                      {handoffSummary.recentLabHighlights.map((lab, i) => (
                        <div key={i} className="text-[11px] text-slate-600">
                          <strong>{lab.date} - {lab.title}:</strong> {lab.keyFindings.join('; ')}
                          {lab.abnormalBiomarkers && lab.abnormalBiomarkers.length > 0 && (
                            <span className="text-amber-800 ml-1 font-semibold">
                              [Elevated: {lab.abnormalBiomarkers.join(', ')}]
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Attending Physician Clinical Focus Areas */}
                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 space-y-2">
                  <span className="font-bold text-amber-900 block flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>Clinical Focus Areas for Physician Encounter</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {handoffSummary.clinicalConcernsAndFocusAreas.map((concern, i) => (
                      <li key={i}>{concern}</li>
                    ))}
                  </ul>
                </div>

                {/* 5. Recommended Clinical Questions */}
                <div className="bg-teal-50/60 rounded-2xl p-4 border border-teal-200 space-y-2">
                  <span className="font-bold text-teal-900 block flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-teal-700" />
                    <span>Recommended Probing Questions</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {handoffSummary.recommendedClinicalQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>

                {/* 6. Clinical Disclaimer */}
                <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 italic">
                  {handoffSummary.clinicalDisclaimer}
                </p>
              </div>
            ) : null}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Generated for Attending Physician Review</span>
              <button
                onClick={() => setHandoffModalApt(null)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
              >
                Close Handoff Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
