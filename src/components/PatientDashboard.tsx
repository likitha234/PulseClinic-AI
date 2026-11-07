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
  TrendingDown,
  X,
  Edit3,
  CalendarCheck,
  CalendarX,
  FileCheck2,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Upload,
  Send,
  CheckCheck,
} from 'lucide-react';
import {
  PatientDashboardData,
  Appointment,
  MedicalRecordReport,
  Prescription,
  MonthlyCheckIn,
  HealthTimelineEvent,
  PatientNotification,
  CheckInChatMessage,
  SupportedLanguage,
  ReportBiomarkerComparison,
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
  // Navigation tabs in Patient Dashboard (Requirement: 9 distinct sections)
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'appointments'
    | 'medical-records'
    | 'prescriptions'
    | 'timeline'
    | 'check-in'
    | 'notifications'
    | 'profile'
    | 'intake'
  >('overview');

  // Dashboard Data State
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Appointment filter sub-tab
  const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'pending' | 'completed' | 'cancelled'>('upcoming');

  // Medical records sub-tab
  const [recordFilter, setRecordFilter] = useState<'reports' | 'prescriptions' | 'history' | 'biomarkers'>('reports');

  // Conversational AI Check-in Agent State (Requirement 5)
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInLanguage, setCheckInLanguage] = useState<SupportedLanguage>('en');
  const [checkInSessionId, setCheckInSessionId] = useState<string>('');
  const [checkInMessages, setCheckInMessages] = useState<CheckInChatMessage[]>([]);
  const [checkInInput, setCheckInInput] = useState('');
  const [checkInProcessing, setCheckInProcessing] = useState(false);
  const [checkInIsComplete, setCheckInIsComplete] = useState(false);
  const [checkInRedFlagAlert, setCheckInRedFlagAlert] = useState<string | null>(null);
  const [checkInExtractedVitals, setCheckInExtractedVitals] = useState<any>({});
  const [checkInMode, setCheckInMode] = useState<'ai-agent' | 'manual-form'>('ai-agent');

  // Manual Check-in Form Fallback
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

  // Biomarker Longitudinal Comparison & Upload State (Requirement 7)
  const [reportComparisonData, setReportComparisonData] = useState<{
    reports: MedicalRecordReport[];
    biomarkers: ReportBiomarkerComparison[];
    summary: any;
  } | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [showUploadReportModal, setShowUploadReportModal] = useState(false);
  const [uploadReportLoading, setUploadReportLoading] = useState(false);
  const [uploadReportForm, setUploadReportForm] = useState({
    title: 'Comprehensive Metabolic Panel (CMP)',
    category: 'LAB_REPORT' as const,
    date: new Date().toISOString().split('T')[0],
    doctorName: 'Dr. Sarah Jenkins',
    summary: 'Annual metabolic and lipid panel screening.',
    totalCholesterol: '202 mg/dL',
    ldlCholesterol: '118 mg/dL',
    hdlCholesterol: '62 mg/dL',
    bloodGlucose: '94 mg/dL',
    systolicBp: '124 mmHg',
    diastolicBp: '80 mmHg',
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

  // Open Conversational AI Check-in Session
  const handleOpenCheckInModal = async () => {
    setShowCheckInModal(true);
    setCheckInError('');
    setCheckInSuccess('');
    setCheckInRedFlagAlert(null);
    setCheckInIsComplete(false);

    const token = localStorage.getItem('pulseclinic_auth_token');
    try {
      const email = data?.patientProfile.email || currentUser.email || 'eleanor.hughes@example.com';
      const uid = data?.patientProfile.id || currentUser.uid || 'pat-eleanor-01';
      const name = data?.patientProfile.fullName || currentUser.displayName || 'Eleanor Hughes';

      const res = await fetch(
        `/api/patient/check-in/session?email=${encodeURIComponent(email)}&patientId=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}&language=${checkInLanguage}`,
        {
          headers: { Authorization: `Bearer ${token || ''}` },
        }
      );
      const json = await res.json();
      if (json.success && json.data) {
        setCheckInSessionId(json.data.sessionId);
        setCheckInMessages(json.data.messages || []);
        setCheckInIsComplete(json.data.isComplete || false);
        setCheckInExtractedVitals(json.data.extractedVitals || {});
      }
    } catch (err) {
      console.error('[CheckIn] Error opening session:', err);
    }
  };

  // Send turn in Conversational Check-in
  const handleSendCheckInMessage = async (customText?: string) => {
    const textToSend = (customText || checkInInput).trim();
    if (!textToSend || checkInProcessing || !checkInSessionId) return;

    setCheckInInput('');
    setCheckInProcessing(true);

    const patientMsg: CheckInChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'patient',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: checkInLanguage,
    };
    setCheckInMessages((prev) => [...prev, patientMsg]);

    try {
      const res = await fetch('/api/patient/check-in/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: checkInSessionId,
          messageText: textToSend,
          language: checkInLanguage,
        }),
      });

      const json = await res.json();
      if (json.success && json.session) {
        setCheckInMessages(json.session.messages || []);
        setCheckInExtractedVitals(json.session.extractedVitals || {});
        if (json.redFlagAlert?.triggered) {
          setCheckInRedFlagAlert(json.redFlagAlert.message);
        }
        if (json.isComplete) {
          setCheckInIsComplete(true);
          fetchDashboardData(true);
        }
      }
    } catch (err: any) {
      console.error('[CheckIn] Turn error:', err);
    } finally {
      setCheckInProcessing(false);
    }
  };

  // Load Biomarker Comparison
  const loadReportComparison = async () => {
    setComparisonLoading(true);
    const token = localStorage.getItem('pulseclinic_auth_token');
    try {
      const email = data?.patientProfile.email || currentUser.email || 'eleanor.hughes@example.com';
      const uid = data?.patientProfile.id || currentUser.uid || 'pat-eleanor-01';
      const name = data?.patientProfile.fullName || currentUser.displayName || 'Eleanor Hughes';

      const res = await fetch(
        `/api/patient/reports/comparison?email=${encodeURIComponent(email)}&patientId=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}`,
        {
          headers: { Authorization: `Bearer ${token || ''}` },
        }
      );
      const json = await res.json();
      if (json.success && json.data) {
        setReportComparisonData(json.data);
      }
    } catch (err) {
      console.error('[ReportComparison] Error loading:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Upload New Lab Report
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadReportLoading(true);
    const token = localStorage.getItem('pulseclinic_auth_token');

    const metrics = [
      { name: 'Total Cholesterol', value: uploadReportForm.totalCholesterol },
      { name: 'LDL Cholesterol', value: uploadReportForm.ldlCholesterol },
      { name: 'HDL Cholesterol', value: uploadReportForm.hdlCholesterol },
      { name: 'Fasting Blood Glucose', value: uploadReportForm.bloodGlucose },
      { name: 'Systolic Blood Pressure', value: uploadReportForm.systolicBp },
      { name: 'Diastolic Blood Pressure', value: uploadReportForm.diastolicBp },
    ];

    try {
      const email = data?.patientProfile.email || currentUser.email || 'eleanor.hughes@example.com';
      const uid = data?.patientProfile.id || currentUser.uid || 'pat-eleanor-01';

      const res = await fetch('/api/patient/reports/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          patientEmail: email,
          patientId: uid,
          title: uploadReportForm.title,
          category: uploadReportForm.category,
          date: uploadReportForm.date,
          doctorName: uploadReportForm.doctorName,
          summary: uploadReportForm.summary,
          metrics,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowUploadReportModal(false);
        fetchDashboardData(true);
        loadReportComparison();
      }
    } catch (err) {
      console.error('[UploadReport] Error:', err);
    } finally {
      setUploadReportLoading(false);
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

      {/* MAIN LAYOUT: VERTICAL LEFT SIDEBAR + ACTIVE CONTENT AREA (Requirement: Clean left sidebar with 9 sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* VERTICAL LEFT SIDEBAR (3 cols on desktop) */}
        <aside className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-2 sticky top-6">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Patient Portal Navigation
          </div>

          {/* 1. Overview */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'overview'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Activity className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'overview' ? 'opacity-100' : 'opacity-40'}`} />
          </button>

          {/* 2. Appointments */}
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'appointments'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Appointments</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'appointments' ? 'bg-white text-teal-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {appointments.upcoming.length + appointments.pending.length}
            </span>
          </button>

          {/* 3. Medical Reports */}
          <button
            onClick={() => setActiveTab('medical-records')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'medical-records'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <FileText className="w-4 h-4 shrink-0" />
              <span>Medical Reports</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'medical-records' ? 'bg-white text-teal-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {medicalRecords.reports.length}
            </span>
          </button>

          {/* 4. Prescriptions */}
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'prescriptions'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Pill className="w-4 h-4 shrink-0" />
              <span>Prescriptions</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'prescriptions' ? 'bg-white text-teal-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {medicalRecords.prescriptions.length}
            </span>
          </button>

          {/* 5. Health Timeline */}
          <button
            onClick={() => setActiveTab('timeline')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'timeline'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Health Timeline</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'timeline' ? 'opacity-100' : 'opacity-40'}`} />
          </button>

          {/* 6. Monthly Check-in */}
          <button
            onClick={() => setActiveTab('check-in')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'check-in'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <HeartPulse className="w-4 h-4 shrink-0" />
              <span>Monthly Check-in</span>
            </div>
            {monthlyCheckIn.status === 'DUE_SOON' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>

          {/* 7. Notifications */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'notifications'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </div>
            {unreadNotificationCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadNotificationCount}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">0</span>
            )}
          </button>

          <div className="border-t border-slate-100 my-2 pt-2 space-y-2">
            {/* 8. My Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === 'profile'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <User className="w-4 h-4 shrink-0" />
                <span>My Profile</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ${activeTab === 'profile' ? 'opacity-100' : 'opacity-40'}`} />
            </button>

            {/* 9. AI Symptom Intake */}
            <button
              onClick={() => {
                onStartIntake();
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-white" />
                <span>AI Symptom Intake</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-90" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT AREA: ONLY Selected Section Displayed (9 cols on desktop) */}
        <div className="lg:col-span-9 min-w-0">

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
                  onClick={handleOpenCheckInModal}
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex flex-wrap gap-2">
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
              <button
                onClick={() => {
                  setRecordFilter('biomarkers');
                  if (!reportComparisonData) {
                    loadReportComparison();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 ${
                  recordFilter === 'biomarkers'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-700 bg-teal-50 hover:bg-teal-100'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Biomarker Comparisons</span>
              </button>
            </div>

            <button
              onClick={() => setShowUploadReportModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Report</span>
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

          {/* Biomarkers Longitudinal Sub-view */}
          {recordFilter === 'biomarkers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Longitudinal Biomarker Comparison
                      </h3>
                      <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold">
                        AI-Extracted Trends
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Tracking vital lab biomarkers over time across all uploaded clinical diagnostic panels.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={loadReportComparison}
                      disabled={comparisonLoading}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${comparisonLoading ? 'animate-spin text-teal-600' : ''}`} />
                      <span>{comparisonLoading ? 'Analyzing...' : 'Refresh Trends'}</span>
                    </button>
                    <button
                      onClick={() => setShowUploadReportModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Report</span>
                    </button>
                  </div>
                </div>

                {comparisonLoading && !reportComparisonData && (
                  <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                    <span>Analyzing longitudinal biomarkers from health records...</span>
                  </div>
                )}

                {reportComparisonData && (
                  <div className="space-y-6 pt-2">
                    {/* Trajectory Insights Banner */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100/80 text-teal-700 flex items-center justify-center font-bold">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            Trajectory Overview: {reportComparisonData.reports?.length || 0} Panels Analyzed
                          </div>
                          <div className="text-slate-500">
                            {reportComparisonData.summary?.trajectoryNote || 'Biomarkers are tracking consistently with steady physiological indicators.'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                          {reportComparisonData.summary?.normalCount || 0} In Target
                        </span>
                        {(reportComparisonData.summary?.abnormalCount || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                            {reportComparisonData.summary?.abnormalCount} Requiring Attention
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Table of Biomarkers */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">Biomarker</th>
                            <th className="py-3 px-4">Standard Range</th>
                            <th className="py-3 px-4">Historical Readings</th>
                            <th className="py-3 px-4">Latest Result</th>
                            <th className="py-3 px-4">Longitudinal Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportComparisonData.biomarkers?.map((b, idx) => (
                            <tr key={b.biomarkerKey || b.biomarkerName || idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <div>{b.name || b.biomarkerName}</div>
                                <div className="text-[10px] font-normal text-slate-400 capitalize">{(b.category || 'biomarker').toLowerCase().replace('_', ' ')}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium">
                                {b.referenceRange}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                  {(b.historicalValues || []).map((h, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono"
                                      title={h.reportDate}
                                    >
                                      {h.value} <span className="text-[9px] text-slate-400">({h.reportDate.split('-').slice(1).join('/')})</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {b.currentValue}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      b.status === 'NORMAL'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : b.status === 'HIGH'
                                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-1.5">
                                  {b.changeTrend === 'INCREASED' && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                      <TrendingUp className="w-3 h-3 text-rose-600" />
                                      <span>Elevated</span>
                                    </span>
                                  )}
                                  {b.changeTrend === 'DECREASED' && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                                      <TrendingDown className="w-3 h-3 text-blue-600" />
                                      <span>Decreased</span>
                                    </span>
                                  )}
                                  {b.changeTrend === 'STABLE' && (
                                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                      <span>Stable</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!comparisonLoading && (!reportComparisonData || reportComparisonData.biomarkers?.length === 0) && (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-600">No longitudinal lab panel comparisons found yet.</p>
                    <button
                      onClick={loadReportComparison}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Extract & Compare Now
                    </button>
                  </div>
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
                onClick={handleOpenCheckInModal}
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

      {/* 4. STANDALONE PRESCRIPTIONS TAB (Requirement: 9 sections) */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active & Historical Prescriptions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current medications prescribed by your clinic physicians with dosage instructions and refill status.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full">
              {medicalRecords.prescriptions.length} Records on File
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            {medicalRecords.prescriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicalRecords.prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{rx.medicationName}</h4>
                          <span className="text-xs font-semibold text-teal-700">{rx.dosage}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rx.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {rx.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                      <div>
                        <strong>Instructions:</strong> {rx.instructions}
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>Refills Remaining: <strong>{rx.refillsRemaining}</strong></span>
                        <span>Prescribed by: {rx.prescribedBy}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No active or past prescriptions recorded in your medical chart.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. STANDALONE MY PROFILE TAB (Requirement: 9 sections) */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Patient Profile & Clinical Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authenticated demographic records, clinical history, and emergency contact details stored in Cloud Firestore.
              </p>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <User className="w-4 h-4 text-teal-600" />
                <span>Personal & Contact Info</span>
              </h3>
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-bold text-slate-900">{patientDisplayName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-semibold">{patientProfile.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Phone Number</span>
                  <span className="font-semibold">{patientProfile.phone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Date of Birth</span>
                  <span>{patientProfile.dateOfBirth || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Gender</span>
                  <span>{patientProfile.gender || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Blood Group</span>
                  <span className="font-bold text-teal-700">{patientProfile.bloodGroup || 'O+'}</span>
                </div>
              </div>
            </div>

            {/* Medical Memory Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                <span>Clinical History & Alerts</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Documented Allergies:</span>
                  {patientProfile.medicalHistory.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patientProfile.medicalHistory.allergies.map((all, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-medium">
                          {all}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">No known allergies on file</span>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">Chronic Conditions:</span>
                  {patientProfile.medicalHistory.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patientProfile.medicalHistory.chronicConditions.map((cond, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-medium">
                          {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">None recorded</span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">Emergency Contact:</span>
                  {patientProfile.emergencyContact ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-900">{patientProfile.emergencyContact.name} ({patientProfile.emergencyContact.relationship})</p>
                      <p className="text-slate-500">{patientProfile.emergencyContact.phone}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">No emergency contact registered</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. AI SYMPTOM INTAKE SECTION (Requirement: 9 sections) */}
      {activeTab === 'intake' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-800 to-cyan-900 rounded-3xl p-8 text-white space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">AI Conversational Symptom Intake</h2>
            <p className="text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Launch a full clinical dialogue with our triage engine. Gemini reviews your reported symptoms, checks emergency red flags, matches an appropriate specialist, and schedules an appointment for doctor approval.
            </p>
            <div className="pt-2">
              <button
                onClick={onStartIntake}
                className="px-6 py-3 bg-white text-teal-950 hover:bg-teal-50 rounded-2xl text-xs font-black transition-all shadow-lg flex items-center space-x-2"
              >
                <span>Launch Intake Conversation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* MODAL: MONTHLY CHECK-IN (Requirement 5) */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Monthly AI Health Check-in Agent
                  </h3>
                  <p className="text-xs text-slate-500">
                    Personalized multi-turn clinical check-in powered by Gemini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckInModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selector & Mode Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Language:
                </span>
                {(
                  [
                    { code: 'en', label: 'English' },
                    { code: 'te', label: 'తెలుగు' },
                    { code: 'hi', label: 'हिन्दी' },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setCheckInLanguage(lang.code);
                      handleOpenCheckInModal();
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                      checkInLanguage === lang.code
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-1 bg-white p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setCheckInMode('ai-agent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    checkInMode === 'ai-agent'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  AI Conversation
                </button>
                <button
                  onClick={() => setCheckInMode('manual-form')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    checkInMode === 'manual-form'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Manual Vitals
                </button>
              </div>
            </div>

            {/* AI Agent Mode */}
            {checkInMode === 'ai-agent' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Red Flag Warning Alert */}
                {checkInRedFlagAlert && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Clinical Red-Flag Indicator Detected</div>
                      <p className="text-[11px] text-red-700">{checkInRedFlagAlert}</p>
                    </div>
                  </div>
                )}

                {/* Extracted Vitals Pill Strip */}
                {(checkInExtractedVitals?.bloodPressure ||
                  checkInExtractedVitals?.heartRate ||
                  checkInExtractedVitals?.wellnessScore) && (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900">
                    <span className="font-bold text-[11px] text-teal-800">Chart Vitals:</span>
                    {checkInExtractedVitals.bloodPressure && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200 font-mono font-bold text-[11px]">
                        BP: {checkInExtractedVitals.bloodPressure}
                      </span>
                    )}
                    {checkInExtractedVitals.heartRate && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200 font-mono font-bold text-[11px]">
                        HR: {checkInExtractedVitals.heartRate} bpm
                      </span>
                    )}
                    {checkInExtractedVitals.wellnessScore && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200 font-mono font-bold text-[11px]">
                        Wellness: {checkInExtractedVitals.wellnessScore}/10
                      </span>
                    )}
                  </div>
                )}

                {/* Conversation Scroll Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 rounded-2xl border border-slate-200 min-h-[220px] max-h-[300px]">
                  {checkInMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-1 shadow-xs ${
                          msg.sender === 'patient'
                            ? 'bg-teal-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75 gap-2">
                          <span className="font-bold">
                            {msg.sender === 'patient' ? 'You' : 'PulseClinic AI Agent'}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {checkInProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 text-xs text-slate-600 flex items-center space-x-2 shadow-xs">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                        <span className="text-[11px]">PulseClinic AI is reviewing responses & medical history...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Response Chips */}
                {!checkInIsComplete && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Quick Responses:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(checkInLanguage === 'te'
                        ? [
                            'నా రక్తపోటు 120/80 ఉంది',
                            'మందులు సక్రమంగా వేసుకుంటున్నాను',
                            'కొత్త లక్షణాలు ఏమీ లేవు, అంతా బాగుంది',
                            'మోకాళ్ళ నొప్పులు ఉన్నాయి',
                          ]
                        : checkInLanguage === 'hi'
                        ? [
                            'मेरा बीपी 120/80 है',
                            'दवाएं समय पर ले रहा हूँ',
                            'कोई नया लक्षण नहीं है, सब ठीक है',
                            'घुटनों में हल्का दर्द है',
                          ]
                        : [
                            'BP is 120/80 today, feeling well',
                            'Taking all prescribed medications',
                            'No new symptoms to report',
                            'Mild morning knee stiffness',
                          ]
                      ).map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendCheckInMessage(chip)}
                          disabled={checkInProcessing}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-[11px] text-slate-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input or Completion Card */}
                {!checkInIsComplete ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendCheckInMessage();
                    }}
                    className="flex items-center space-x-2 pt-1"
                  >
                    <input
                      type="text"
                      value={checkInInput}
                      onChange={(e) => setCheckInInput(e.target.value)}
                      placeholder={
                        checkInLanguage === 'te'
                          ? 'మీ సమాధానం లేదా రీడింగ్స్ ఇక్కడ టైప్ చేయండి...'
                          : checkInLanguage === 'hi'
                          ? 'अपना उत्तर या रीडिंग यहाँ लिखें...'
                          : 'Type your symptoms, medication updates, or vitals...'
                      }
                      disabled={checkInProcessing}
                      className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!checkInInput.trim() || checkInProcessing}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in fade-in">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                    <div className="text-xs font-bold text-emerald-950">
                      Monthly AI Health Check-in Completed
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed max-w-md mx-auto">
                      Your responses and vital indicators have been updated in your clinical health timeline. Next check-in has been automatically scheduled for 30 days from now.
                    </p>
                    <button
                      onClick={() => {
                        setShowCheckInModal(false);
                        fetchDashboardData(true);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      Done & Close
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual Form Fallback Mode */}
            {checkInMode === 'manual-form' && (
              <form onSubmit={handleCheckInSubmit} className="space-y-4 pt-1">
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Notes for Doctor</label>
                  <textarea
                    rows={2}
                    value={checkInForm.notes}
                    onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })}
                    placeholder="Dietary changes, medication tolerance, general energy..."
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
                    {checkInSubmitting ? 'Saving...' : 'Save Vitals Check-in'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DIAGNOSTIC LAB REPORT (Requirement 7) */}
      {showUploadReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Diagnostic Lab Report</h3>
                  <p className="text-xs text-slate-500">Record report biomarkers for automated longitudinal tracking</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadReportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadReport} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Report Title</label>
                <input
                  type="text"
                  value={uploadReportForm.title}
                  onChange={(e) => setUploadReportForm({ ...uploadReportForm, title: e.target.value })}
                  placeholder="e.g. Comprehensive Metabolic Panel"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date of Report</label>
                  <input
                    type="date"
                    value={uploadReportForm.date}
                    onChange={(e) => setUploadReportForm({ ...uploadReportForm, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Doctor / Laboratory</label>
                  <input
                    type="text"
                    value={uploadReportForm.doctorName}
                    onChange={(e) => setUploadReportForm({ ...uploadReportForm, doctorName: e.target.value })}
                    placeholder="Dr. Sarah Jenkins"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Clinical Summary</label>
                <textarea
                  rows={2}
                  value={uploadReportForm.summary}
                  onChange={(e) => setUploadReportForm({ ...uploadReportForm, summary: e.target.value })}
                  placeholder="Routine fasting metabolic and lipid panel screening..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Biomarker Entries */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  <span>Report Biomarker Measurements</span>
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-600">Total Cholesterol</label>
                    <input
                      type="text"
                      value={uploadReportForm.totalCholesterol}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, totalCholesterol: e.target.value })}
                      placeholder="202 mg/dL"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">LDL Cholesterol</label>
                    <input
                      type="text"
                      value={uploadReportForm.ldlCholesterol}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, ldlCholesterol: e.target.value })}
                      placeholder="118 mg/dL"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">HDL Cholesterol</label>
                    <input
                      type="text"
                      value={uploadReportForm.hdlCholesterol}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, hdlCholesterol: e.target.value })}
                      placeholder="62 mg/dL"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">Fasting Blood Glucose</label>
                    <input
                      type="text"
                      value={uploadReportForm.bloodGlucose}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, bloodGlucose: e.target.value })}
                      placeholder="94 mg/dL"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">Systolic Blood Pressure</label>
                    <input
                      type="text"
                      value={uploadReportForm.systolicBp}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, systolicBp: e.target.value })}
                      placeholder="124 mmHg"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600">Diastolic Blood Pressure</label>
                    <input
                      type="text"
                      value={uploadReportForm.diastolicBp}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, diastolicBp: e.target.value })}
                      placeholder="80 mmHg"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadReportModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadReportLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {uploadReportLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting & Saving...</span>
                    </>
                  ) : (
                    <span>Save & Extract Biomarkers</span>
                  )}
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
