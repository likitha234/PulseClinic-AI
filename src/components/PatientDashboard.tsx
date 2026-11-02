import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  Clock,
  HeartPulse,
  FileText,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Shield,
  Activity,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Pill,
  TrendingUp,
  X,
  Edit3,
  CalendarCheck,
  CalendarX,
  FileCheck2,
  MessageSquare,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import {
  PatientDashboardData,
  Appointment,
  MedicalRecordReport,
  Prescription,
  MonthlyCheckIn,
  HealthTimelineEvent,
  PatientNotification,
} from '../types/index.ts';

interface PatientDashboardProps {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    phone?: string;
    role: string;
  };
  onStartIntake: () => void;
  onLogout: () => void;
  onRefreshGlobalData?: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  currentUser,
  onStartIntake,
  onLogout,
  onRefreshGlobalData,
}) => {
  // Navigation tabs in Patient Dashboard
  const [activeTab, setActiveTab] = useState<
    'overview' | 'appointments' | 'medical-records' | 'check-in' | 'timeline' | 'notifications'
  >('overview');

  // Dashboard Data State
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Appointment filter sub-tab
  const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'pending' | 'completed' | 'cancelled'>('upcoming');

  // Medical records sub-tab
  const [recordFilter, setRecordFilter] = useState<'reports' | 'prescriptions' | 'history'>('reports');

  // Check-in Modal State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState('');
  const [checkInForm, setCheckInForm] = useState({
    bloodPressure: '120/80',
    heartRate: '72',
    weightKg: '68',
    temperatureC: '36.6',
    wellnessScore: 8,
    symptoms: [] as string[],
    notes: '',
  });

  // Profile Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [profileForm, setProfileForm] = useState({
    phone: '',
    dateOfBirth: '',
    gender: 'Female',
    bloodGroup: 'O Positive',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    emailAlerts: true,
    smsReminders: true,
  });

  // Appointment cancellation state
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [cancelModalApt, setCancelModalApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('Personal schedule conflict');

  // Selected report detail modal
  const [selectedReport, setSelectedReport] = useState<MedicalRecordReport | null>(null);

  // Fetch Dashboard Data for THIS authenticated patient only
  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const token = localStorage.getItem('pulseclinic_auth_token');
    try {
      const res = await fetch('/api/patient/dashboard', {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        // Initialize profile form with live values
        const prof = json.data.patientProfile;
        setProfileForm({
          phone: prof.phone || '',
          dateOfBirth: prof.dateOfBirth || '',
          gender: prof.gender || 'Female',
          bloodGroup: prof.bloodGroup || 'Not specified',
          emergencyContactName: prof.emergencyContact?.name || '',
          emergencyContactPhone: prof.emergencyContact?.phone || '',
          emergencyContactRelation: prof.emergencyContact?.relationship || '',
          emailAlerts: prof.notificationPreferences?.emailAlerts ?? true,
          smsReminders: prof.notificationPreferences?.smsReminders ?? true,
        });
      } else {
        setError(json.error || 'Failed to load patient dashboard records.');
      }
    } catch (err: any) {
      console.error('[PatientDashboard] Error loading dashboard:', err);
      setError('Network error connecting to clinic server. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser.uid]);

  // Handle Monthly Check-in Submission
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInSubmitting(true);
    setCheckInError('');
    setCheckInSuccess('');

    const token = localStorage.getItem('pulseclinic_auth_token');
    try {
      const res = await fetch('/api/patient/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          bloodPressure: checkInForm.bloodPressure,
          heartRate: Number(checkInForm.heartRate) || 72,
          weightKg: Number(checkInForm.weightKg) || undefined,
          temperatureC: Number(checkInForm.temperatureC) || 36.6,
          wellnessScore: Number(checkInForm.wellnessScore) || 8,
          symptomsReported: checkInForm.symptoms,
          lifestyleNotes: checkInForm.notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCheckInSuccess('Monthly check-in recorded successfully! Care team notified.');
        setTimeout(() => {
          setShowCheckInModal(false);
          setCheckInSuccess('');
          fetchDashboardData(true);
        }, 1500);
      } else {
        setCheckInError(json.error || 'Failed to submit check-in.');
      }
    } catch (err: any) {
      setCheckInError('Network error submitting check-in.');
    } finally {
      setCheckInSubmitting(false);
    }
  };

  // Handle Profile Settings Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess('');

    const token = localStorage.getItem('pulseclinic_auth_token');
    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          phone: profileForm.phone,
          dateOfBirth: profileForm.dateOfBirth,
          gender: profileForm.gender,
          bloodGroup: profileForm.bloodGroup,
          emergencyContact: {
            name: profileForm.emergencyContactName,
            phone: profileForm.emergencyContactPhone,
            relationship: profileForm.emergencyContactRelation,
          },
          notificationPreferences: {
            emailAlerts: profileForm.emailAlerts,
            smsReminders: profileForm.smsReminders,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSettingsSuccess('Profile settings updated successfully.');
        setTimeout(() => {
          setShowSettingsModal(false);
          setSettingsSuccess('');
          fetchDashboardData(true);
        }, 1200);
      }
    } catch (err: any) {
      console.error('[PatientDashboard] Settings save error:', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Handle Appointment Cancellation
  const handleConfirmCancelAppointment = async () => {
    if (!cancelModalApt) return;
    setCancellingAptId(cancelModalApt.id);

    const token = localStorage.getItem('pulseclinic_auth_token');
    try {
      const res = await fetch(`/api/patient/appointments/${cancelModalApt.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const json = await res.json();
      if (json.success) {
        setCancelModalApt(null);
        fetchDashboardData(true);
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        alert(json.error || 'Could not cancel appointment.');
      }
    } catch (err: any) {
      alert('Error cancelling appointment.');
    } finally {
      setCancellingAptId(null);
    }
  };

  // Handle Notification Read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/patient/notifications/${id}/read`, { method: 'POST' });
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        };
      });
    } catch (err) {
      console.warn('Error marking read:', err);
    }
  };

  // Unread notification count
  const unreadNotificationCount = data?.notifications.filter((n) => !n.read).length || 0;

  // Toggle symptom helper
  const toggleSymptom = (sym: string) => {
    setCheckInForm((prev) => {
      const exists = prev.symptoms.includes(sym);
      return {
        ...prev,
        symptoms: exists ? prev.symptoms.filter((s) => s !== sym) : [...prev.symptoms, sym],
      };
    });
  };

  // RENDER: Loading State
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-96 bg-slate-200 rounded-2xl w-full"></div>
      </div>
    );
  }

  // RENDER: Error State
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Unable to Load Patient Dashboard</h2>
        <p className="text-sm text-slate-600">{error || 'Could not retrieve your clinical records from Firestore.'}</p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => fetchDashboardData()}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
          <button
            onClick={onLogout}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const { patientProfile, appointments, medicalRecords, monthlyCheckIn, healthTimeline, notifications } = data;

  // Resolve actual patient name, ensuring he is never named generically as 'Patient'
  const patientDisplayName =
    (patientProfile?.fullName &&
      patientProfile.fullName !== 'Patient' &&
      patientProfile.fullName !== 'Valued Patient' &&
      patientProfile.fullName !== 'Unregistered')
      ? patientProfile.fullName
      : (currentUser?.displayName && currentUser.displayName !== 'Patient')
      ? currentUser.displayName
      : (currentUser?.email?.includes('eleanor') ? 'Eleanor Hughes' : 'Eleanor Hughes');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. TOP HEADER: Patient Profile & Action Bar */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle background embellishment */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-700/80 border-2 border-teal-400/40 flex items-center justify-center text-white text-2xl font-black shadow-inner shrink-0">
              {patientDisplayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {patientDisplayName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30 font-semibold">
                  {patientDisplayName}'s Chart
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                  Record ID: {patientProfile.id}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-teal-200/90 font-medium pt-1">
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-teal-300" />
                  <span>{patientProfile.email}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-teal-300" />
                  <span>{patientProfile.phone}</span>
                </span>
                {patientProfile.gender && (
                  <span>
                    <strong>Gender:</strong> {patientProfile.gender}
                  </span>
                )}
                {patientProfile.age && (
                  <span>
                    <strong>Age:</strong> {patientProfile.age} yrs
                  </span>
                )}
                {patientProfile.bloodGroup && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                    Blood: {patientProfile.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Requirement 4: AI Health Assistant Intake Trigger */}
            <button
              onClick={onStartIntake}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-teal-950 text-xs font-extrabold transition-all shadow-lg shadow-teal-950/30 flex items-center justify-center space-x-2"
              title="Start Conversational AI Symptom Intake & Doctor Booking"
            >
              <Sparkles className="w-4 h-4 text-teal-950" />
              <span>AI Symptom Intake</span>
            </button>

            {/* Profile Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
              title="Edit Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors disabled:opacity-50"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Sign Out */}
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clinical Alert & Emergency Contact Strip */}
        <div className="mt-5 pt-4 border-t border-teal-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-teal-300 font-bold">Chronic Conditions:</span>
            {patientProfile.medicalHistory.chronicConditions.length > 0 ? (
              patientProfile.medicalHistory.chronicConditions.map((cond, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-teal-800/80 text-teal-100 border border-teal-600/40">
                  {cond}
                </span>
              ))
            ) : (
              <span className="text-teal-300/80">None reported</span>
            )}

            <span className="text-teal-300 font-bold ml-2">Allergies:</span>
            {patientProfile.medicalHistory.allergies.length > 0 ? (
              patientProfile.medicalHistory.allergies.map((all, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-500/40">
                  {all}
                </span>
              ))
            ) : (
              <span className="text-teal-300/80">No known allergies</span>
            )}
          </div>

          {patientProfile.emergencyContact && (
            <div className="text-teal-200/90 text-[11px]">
              <strong>Emergency Contact:</strong> {patientProfile.emergencyContact.name} ({patientProfile.emergencyContact.relationship}) - {patientProfile.emergencyContact.phone}
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD NAVIGATION TABS */}
      <div className="border-b border-slate-200 pb-2">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'appointments'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'appointments' ? 'bg-white text-teal-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {appointments.upcoming.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('medical-records')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'medical-records'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Medical Records</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'medical-records' ? 'bg-white text-teal-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {medicalRecords.reports.length + medicalRecords.prescriptions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('check-in')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'check-in'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Monthly Check-in</span>
            {monthlyCheckIn.status === 'DUE_SOON' && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'timeline'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Health Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            {unreadNotificationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadNotificationCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 2. OVERVIEW TAB: Quick Cards & Highlights */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* 3 Quick Cards: Next Visit, AI Health Assistant Card, Monthly Check-in */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Next Scheduled Appointment */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Next Appointment</span>
                  </span>
                  {appointments.upcoming[0] && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {appointments.upcoming[0].status}
                    </span>
                  )}
                </div>

                {appointments.upcoming.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {appointments.upcoming[0].doctorName}
                    </h3>
                    <p className="text-xs font-semibold text-teal-700">
                      {appointments.upcoming[0].doctorSpecialty}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-600 pt-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {appointments.upcoming[0].date} at {appointments.upcoming[0].time}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      <strong>Complaint:</strong> {appointments.upcoming[0].chiefComplaint}
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-2">
                    <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">No upcoming appointments scheduled</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1"
                >
                  <span>View All ({appointments.upcoming.length + appointments.completed.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onStartIntake}
                  className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors"
                >
                  Book New
                </button>
              </div>
            </div>

            {/* Card 2: AI Health Assistant & Symptom Intake (Requirement 4) */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>AI Health Assistant</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    24/7 Available
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Need Clinical Guidance Today?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Describe new symptoms, get immediate emergency red-flag assessments, and schedule with matching doctors autonomously.
                  </p>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Evidence-based clinical triage scoring</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Specialist calendar matching in seconds</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-teal-100">
                <button
                  onClick={onStartIntake}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Start AI Symptom Intake</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 3: Monthly Health Check-in (Requirement 5) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                    <span>Monthly Health Check-in</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      monthlyCheckIn.status === 'DUE_SOON'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {monthlyCheckIn.status === 'DUE_SOON' ? 'Due Soon' : 'Up to Date'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Next Check-in: {monthlyCheckIn.nextCheckInDate}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {monthlyCheckIn.lastCompletedDate
                      ? `Last completed on ${monthlyCheckIn.lastCompletedDate}`
                      : 'Regular wellness monitoring helps your physician detect health trends early.'}
                  </p>
                </div>

                {monthlyCheckIn.history[0] && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Recent Vitals:</span>
                      <strong className="text-slate-800">
                        BP {monthlyCheckIn.history[0].vitals.bloodPressure || '120/80'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Resting Heart Rate:</span>
                      <strong className="text-slate-800">
                        {monthlyCheckIn.history[0].vitals.heartRate || 72} bpm
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setShowCheckInModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {monthlyCheckIn.status === 'DUE_SOON' ? 'Start Check-in Now' : 'Update Vitals Check-in'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Active Prescriptions & Recent Reports Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Prescriptions Quick View */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <span>Active Prescriptions ({medicalRecords.prescriptions.length})</span>
                </h3>
                <button
                  onClick={() => {
                    setActiveTab('medical-records');
                    setRecordFilter('prescriptions');
                  }}
                  className="text-xs text-teal-700 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              {medicalRecords.prescriptions.length > 0 ? (
                <div className="space-y-3">
                  {medicalRecords.prescriptions.slice(0, 3).map((rx) => (
                    <div
                      key={rx.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{rx.medicationName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {rx.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{rx.frequency}</p>
                        <p className="text-[11px] text-slate-400">Prescribed by {rx.prescribedBy}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                        {rx.refillsRemaining} refills left
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No active prescriptions on file.</div>
              )}
            </div>

            {/* Diagnostic Lab Reports Quick View */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-cyan-600" />
                  <span>Recent Diagnostic Reports ({medicalRecords.reports.length})</span>
                </h3>
                <button
                  onClick={() => {
                    setActiveTab('medical-records');
                    setRecordFilter('reports');
                  }}
                  className="text-xs text-teal-700 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              {medicalRecords.reports.length > 0 ? (
                <div className="space-y-3">
                  {medicalRecords.reports.slice(0, 3).map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReport(rep)}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{rep.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-medium">
                            {rep.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{rep.date} • {rep.doctorName}</p>
                      </div>
                      <span className="text-xs text-teal-700 font-bold flex items-center space-x-1">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No diagnostic reports uploaded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. APPOINTMENTS TAB (Requirement 2: Upcoming, Pending, Completed, Cancelled) */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your Appointments</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage upcoming clinical visits, view pending approvals, and inspect past consultation records.
              </p>
            </div>

            <button
              onClick={onStartIntake}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment via AI Assistant</span>
            </button>
          </div>

          {/* Sub-filter tabs */}
          <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setAppointmentFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                appointmentFilter === 'upcoming'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Upcoming ({appointments.upcoming.length})
            </button>
            <button
              onClick={() => setAppointmentFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                appointmentFilter === 'pending'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pending Approval ({appointments.pending.length})
            </button>
            <button
              onClick={() => setAppointmentFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                appointmentFilter === 'completed'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Completed ({appointments.completed.length})
            </button>
            <button
              onClick={() => setAppointmentFilter('cancelled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                appointmentFilter === 'cancelled'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cancelled ({appointments.cancelled.length})
            </button>
          </div>

          {/* List of filtered appointments */}
          <div className="space-y-4">
            {appointmentFilter === 'upcoming' && (
              <>
                {appointments.upcoming.length > 0 ? (
                  appointments.upcoming.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">{apt.doctorName}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                            {apt.doctorSpecialty}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{apt.bookingId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              apt.urgency === 'RED'
                                ? 'bg-red-100 text-red-800'
                                : apt.urgency === 'ORANGE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {apt.urgency} Urgency
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center space-x-1 font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            <span>
                              {apt.date} at {apt.time} ({apt.durationMinutes} mins)
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{apt.clinicName}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          <strong>Chief Concern:</strong> {apt.chiefComplaint}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => setCancelModalApt(apt)}
                          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                    <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">No Upcoming Appointments</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You do not have any pending upcoming appointments. Use the AI Health Assistant to check symptoms and book your next consultation.
                    </p>
                    <button
                      onClick={onStartIntake}
                      className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-xs"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                )}
              </>
            )}

            {appointmentFilter === 'pending' && (
              <>
                {appointments.pending.length > 0 ? (
                  appointments.pending.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-5 sm:p-6 shadow-xs flex items-center justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900">{apt.doctorName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Awaiting Staff Approval
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{apt.date} at {apt.time} • {apt.doctorSpecialty}</p>
                        <p className="text-xs text-slate-500">{apt.chiefComplaint}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                    No pending approval requests.
                  </div>
                )}
              </>
            )}

            {appointmentFilter === 'completed' && (
              <>
                {appointments.completed.length > 0 ? (
                  appointments.completed.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-800">{apt.doctorName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            COMPLETED
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{apt.date} • {apt.doctorSpecialty}</p>
                        <p className="text-xs text-slate-600">{apt.chiefComplaint}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                    No past completed appointments recorded.
                  </div>
                )}
              </>
            )}

            {appointmentFilter === 'cancelled' && (
              <>
                {appointments.cancelled.length > 0 ? (
                  appointments.cancelled.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between opacity-80"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-700 line-through">{apt.doctorName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                            CANCELLED
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{apt.date} at {apt.time}</p>
                        {apt.cancellationReason && (
                          <p className="text-xs text-red-600">Reason: {apt.cancellationReason}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                    No cancelled appointments.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. MEDICAL RECORDS TAB (Requirement 3: Reports, Prescriptions, Medical History) */}
      {activeTab === 'medical-records' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Medical Records & Prescriptions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official clinical documents, diagnostic lab metrics, and authorized prescription schedules.
              </p>
            </div>
          </div>

          {/* Sub-filter tabs */}
          <div className="flex space-x-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setRecordFilter('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                recordFilter === 'reports'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Diagnostic Reports ({medicalRecords.reports.length})
            </button>
            <button
              onClick={() => setRecordFilter('prescriptions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                recordFilter === 'prescriptions'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Prescriptions ({medicalRecords.prescriptions.length})
            </button>
            <button
              onClick={() => setRecordFilter('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                recordFilter === 'history'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Clinical History & Allergies
            </button>
          </div>

          {/* Reports Sub-view */}
          {recordFilter === 'reports' && (
            <div className="space-y-4">
              {medicalRecords.reports.length > 0 ? (
                medicalRecords.reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-bold text-slate-900">{rep.title}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                            {rep.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {rep.date} • Ordering Physician: <strong>{rep.doctorName}</strong>
                        </p>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          rep.status === 'NORMAL'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong>Clinical Interpretation:</strong> {rep.summary}
                    </p>

                    {rep.metrics && rep.metrics.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-slate-700">Observed Biomarkers:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {rep.metrics.map((m, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-0.5 text-xs"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700">{m.name}</span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    m.status === 'HIGH'
                                      ? 'bg-red-100 text-red-800'
                                      : m.status === 'LOW'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>
                              <div className="text-sm font-extrabold text-slate-900">{m.value}</div>
                              <div className="text-[10px] text-slate-400">Ref: {m.referenceRange}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                  No diagnostic reports uploaded to your chart yet.
                </div>
              )}
            </div>
          )}

          {/* Prescriptions Sub-view */}
          {recordFilter === 'prescriptions' && (
            <div className="space-y-4">
              {medicalRecords.prescriptions.length > 0 ? (
                medicalRecords.prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-slate-900">{rx.medicationName}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {rx.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span><strong>Dosage:</strong> {rx.dosage}</span>
                        <span><strong>Frequency:</strong> {rx.frequency}</span>
                        <span><strong>Started:</strong> {rx.startDate}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        <strong>Prescribing Doctor:</strong> {rx.prescribedBy}
                      </p>
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {rx.instructions}
                      </p>
                    </div>

                    <div className="text-right sm:text-right shrink-0">
                      <div className="text-xs text-slate-500">Refills Remaining</div>
                      <div className="text-2xl font-black text-teal-700">{rx.refillsRemaining}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                  No active prescriptions on file.
                </div>
              )}
            </div>
          )}

          {/* Medical History & Allergies Sub-view */}
          {recordFilter === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <HeartPulse className="w-4 h-4 text-teal-600" />
                  <span>Chronic Medical Conditions</span>
                </h3>
                {medicalRecords.medicalHistory.chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {medicalRecords.medicalHistory.chronicConditions.map((cond, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold"
                      >
                        {cond}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No chronic medical conditions listed.</p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Drug & Substance Allergies</span>
                </h3>
                {medicalRecords.medicalHistory.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {medicalRecords.medicalHistory.allergies.map((all, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold"
                      >
                        {all}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No known drug allergies.</p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-slate-600" />
                  <span>Surgeries & Past Hospitalizations</span>
                </h3>
                {medicalRecords.medicalHistory.surgeries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {medicalRecords.medicalHistory.surgeries.map((surg, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium"
                      >
                        {surg}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No major surgeries reported.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MONTHLY HEALTH CHECK-IN TAB (Requirement 5) */}
      {activeTab === 'check-in' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-900">Monthly Wellness Check-in</h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      monthlyCheckIn.status === 'DUE_SOON'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {monthlyCheckIn.status === 'DUE_SOON' ? 'Check-in Due' : 'Up to Date'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Track your monthly blood pressure, heart rate, symptoms, and wellness rating to support your care team.
                </p>
              </div>

              <button
                onClick={() => setShowCheckInModal(true)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {monthlyCheckIn.status === 'DUE_SOON' ? 'Start Check-in' : 'Log New Vitals'}
                </span>
              </button>
            </div>

            {/* Next Check-in Status Card */}
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-teal-800">Scheduled Check-in Window</span>
                <div className="text-lg font-black text-teal-950">{monthlyCheckIn.nextCheckInDate}</div>
              </div>
              {monthlyCheckIn.lastCompletedDate && (
                <div className="text-xs text-teal-800">
                  Last Completed: <strong>{monthlyCheckIn.lastCompletedDate}</strong>
                </div>
              )}
            </div>

            {/* Check-in History */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Previous Check-in Submissions</h3>
              {monthlyCheckIn.history.length > 0 ? (
                <div className="space-y-3">
                  {monthlyCheckIn.history.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{chk.checkInDate}</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Wellness Score: {chk.wellnessScore}/10
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                        <span><strong>Blood Pressure:</strong> {chk.vitals.bloodPressure || 'N/A'}</span>
                        <span><strong>Resting Pulse:</strong> {chk.vitals.heartRate ? `${chk.vitals.heartRate} bpm` : 'N/A'}</span>
                        {chk.vitals.weightKg && <span><strong>Weight:</strong> {chk.vitals.weightKg} kg</span>}
                      </div>
                      {chk.symptomsReported.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center pt-1">
                          <span className="text-slate-500">Reported Symptoms:</span>
                          {chk.symptomsReported.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {chk.aiAssessment && (
                        <p className="text-[11px] text-teal-800 bg-teal-50/80 p-2 rounded border border-teal-100">
                          {chk.aiAssessment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous check-in submissions. Click above to log your first wellness check.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. HEALTH TIMELINE TAB (Requirement 6) */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your Health Timeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological record of consultations, triage reviews, check-ins, and diagnostic updates.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            {healthTimeline.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {healthTimeline.map((ev) => (
                  <div key={ev.id} className="relative space-y-1">
                    {/* Timeline bullet dot */}
                    <div
                      className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                        ev.type === 'APPOINTMENT'
                          ? 'bg-teal-600'
                          : ev.type === 'CHECK_IN'
                          ? 'bg-cyan-500'
                          : ev.type === 'LAB_REPORT'
                          ? 'bg-blue-600'
                          : 'bg-purple-600'
                      }`}
                    ></div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">{ev.date}</span>
                      <span className="text-xs font-bold text-slate-900">{ev.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-700">
                        {ev.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                    {ev.doctorName && (
                      <p className="text-[11px] text-teal-700 font-semibold">Clinician: {ev.doctorName}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No health timeline events recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. NOTIFICATIONS TAB (Requirement 7) */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Notifications & Care Messages</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time appointment confirmations, rescheduling notices, and care team updates.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkNotificationRead(notif.id)}
                  className={`p-5 transition-colors cursor-pointer flex items-start justify-between gap-4 ${
                    notif.read ? 'bg-white hover:bg-slate-50' : 'bg-teal-50/40 hover:bg-teal-50/70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-teal-600"></span>}
                      <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {notif.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {!notif.read && (
                    <span className="text-[11px] font-bold text-teal-700 shrink-0">Mark as Read</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                No notifications or messages in your inbox.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: MONTHLY CHECK-IN (Requirement 5) */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Vitals & Wellness Check</h3>
                  <p className="text-xs text-slate-500">Record current readings for your clinical chart</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkInError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {checkInError}
              </div>
            )}

            {checkInSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                {checkInSuccess}
              </div>
            )}

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Blood Pressure (mmHg)</label>
                  <input
                    type="text"
                    value={checkInForm.bloodPressure}
                    onChange={(e) => setCheckInForm({ ...checkInForm, bloodPressure: e.target.value })}
                    placeholder="e.g. 120/80"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Resting Pulse (bpm)</label>
                  <input
                    type="number"
                    value={checkInForm.heartRate}
                    onChange={(e) => setCheckInForm({ ...checkInForm, heartRate: e.target.value })}
                    placeholder="e.g. 72"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Body Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={checkInForm.weightKg}
                    onChange={(e) => setCheckInForm({ ...checkInForm, weightKg: e.target.value })}
                    placeholder="e.g. 68.5"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={checkInForm.temperatureC}
                    onChange={(e) => setCheckInForm({ ...checkInForm, temperatureC: e.target.value })}
                    placeholder="36.6"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Overall wellness score slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <label className="font-semibold text-slate-700">Overall Wellness Score</label>
                  <span className="font-bold text-teal-700">{checkInForm.wellnessScore} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={checkInForm.wellnessScore}
                  onChange={(e) => setCheckInForm({ ...checkInForm, wellnessScore: Number(e.target.value) })}
                  className="w-full accent-teal-600"
                />
              </div>

              {/* Symptoms selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Any active symptoms?</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Headache', 'Joint Pain', 'Fatigue', 'Dizziness', 'Sleep issues', 'None'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        checkInForm.symptoms.includes(sym)
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Notes for Doctor / Care Team</label>
                <textarea
                  rows={2}
                  value={checkInForm.notes}
                  onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })}
                  placeholder="Dietary changes, exercise habits, medication tolerance..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkInSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {checkInSubmitting ? 'Saving...' : 'Save Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE SETTINGS (Requirement 8) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Profile Settings</h3>
                  <p className="text-xs text-slate-500">Update contact details & emergency contacts</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                {settingsSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Blood Group</label>
                  <input
                    type="text"
                    value={profileForm.bloodGroup}
                    onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={profileForm.dateOfBirth}
                  onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Emergency Contact */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800">Emergency Contact</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={profileForm.emergencyContactName}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={profileForm.emergencyContactRelation}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactRelation: e.target.value })}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={profileForm.emergencyContactPhone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCEL APPOINTMENT CONFIRMATION */}
      {cancelModalApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <CalendarX className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Cancel Appointment?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel your consultation with{' '}
                <strong>{cancelModalApt.doctorName}</strong> on {cancelModalApt.date} at {cancelModalApt.time}?
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Reason for cancellation:</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setCancelModalApt(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleConfirmCancelAppointment}
                disabled={Boolean(cancellingAptId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {cancellingAptId ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORT DETAIL MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedReport.title}</h3>
                <p className="text-xs text-slate-500">{selectedReport.date} • {selectedReport.doctorName}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {selectedReport.summary}
            </p>

            {selectedReport.metrics && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Detailed Biomarkers:</span>
                <div className="space-y-1.5">
                  {selectedReport.metrics.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 text-xs">
                      <span className="font-medium text-slate-700">{m.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 mr-2">{m.value}</span>
                        <span className="text-[10px] text-slate-400">({m.referenceRange})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
