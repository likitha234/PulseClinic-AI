import React, { useState, useEffect } from 'react';
import {
  User,
  Stethoscope,
  ShieldAlert,
  Lock,
  Mail,
  Phone,
  Calendar,
  Award,
  Key,
  FileCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Info,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { DoctorSpecialty } from '../types/index.ts';

export type AuthMode =
  | 'patient-login'
  | 'patient-register'
  | 'doctor-login'
  | 'doctor-register'
  | 'staff-login'
  | 'forgot-password';

interface AuthViewProps {
  initialMode?: AuthMode;
  onSuccess: (user: any, token: string) => void;
  onCancel?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'patient-login',
  onSuccess,
  onCancel,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Firebase Config Status from Server
  const [firebaseStatus, setFirebaseStatus] = useState<{
    configured: boolean;
    projectId: string;
    missingVars: string[];
    info: string;
  } | null>(null);

  // Common Login Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Patient Registration Fields (Requirement 6: Name, Email, Mobile, Date of Birth, Gender, Password)
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientDob, setPatientDob] = useState('1994-06-15');
  const [patientGender, setPatientGender] = useState('Female');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientConfirmPassword, setPatientConfirmPassword] = useState('');

  // Doctor Registration Fields (Requirement 7: Name, Email, Mobile, Specialization, Qualification, Experience, Medical License Number, Password)
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorMobile, setDoctorMobile] = useState('');
  const [doctorSpecialization, setDoctorSpecialization] = useState<DoctorSpecialty>('Cardiologist');
  const [doctorQualification, setDoctorQualification] = useState('MD, FACC, Johns Hopkins');
  const [doctorExperience, setDoctorExperience] = useState('10 years');
  const [doctorLicenseNumber, setDoctorLicenseNumber] = useState('MD-CARDIO-9821');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorConfirmPassword, setDoctorConfirmPassword] = useState('');

  // Forgot Password Fields
  const [forgotEmail, setForgotEmail] = useState('');

  // Fetch Firebase config status on mount
  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setFirebaseStatus(res.data);
      })
      .catch((err) => console.error('[Auth] Failed to load config:', err));
  }, []);

  // Quick fill demo credentials
  const handleQuickFill = (target: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (target === 'patient-eleanor') {
      setMode('patient-login');
      setLoginEmail('eleanor.hughes@example.com');
      setLoginPassword('PatientPass123!');
    } else if (target === 'patient-liam') {
      setMode('patient-login');
      setLoginEmail('liam.henderson@example.com');
      setLoginPassword('PatientPass123!');
    } else if (target === 'doc-vance') {
      setMode('doctor-login');
      setLoginEmail('dr.marcus.vance@pulseclinic.internal');
      setLoginPassword('DoctorPass123!');
    } else if (target === 'doc-mitchell') {
      setMode('doctor-login');
      setLoginEmail('dr.sarah.mitchell@pulseclinic.internal');
      setLoginPassword('DoctorPass123!');
    } else if (target === 'doc-wilson') {
      setMode('doctor-login');
      setLoginEmail('dr.james.wilson@pulseclinic.internal');
      setLoginPassword('DoctorPass123!');
    } else if (target === 'doc-carter') {
      setMode('doctor-login');
      setLoginEmail('dr.emily.carter@pulseclinic.internal');
      setLoginPassword('DoctorPass123!');
    } else if (target === 'doc-anderson') {
      setMode('doctor-login');
      setLoginEmail('dr.robert.anderson@pulseclinic.internal');
      setLoginPassword('DoctorPass123!');
    } else if (target === 'doc-martinez') {
      setMode('doctor-login');
      setLoginEmail('dr.sophia.martinez@pulseclinic.internal');
      setLoginPassword('DoctorPass123!');
    } else if (target === 'staff') {
      setMode('staff-login');
      setLoginEmail('staff@pulseclinic.internal');
      setLoginPassword('PulseCare2026!');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // 1. Patient Login
      if (mode === 'patient-login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
            requestedRole: 'patient',
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Login failed');
        onSuccess(json.data.user, json.data.sessionToken);
      }

      // 2. Patient Registration
      else if (mode === 'patient-register') {
        if (patientPassword !== patientConfirmPassword) {
          throw new Error('Passwords do not match. Please verify your password entry.');
        }
        const res = await fetch('/api/auth/patient/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: patientName,
            email: patientEmail,
            mobile: patientMobile,
            dateOfBirth: patientDob,
            gender: patientGender,
            password: patientPassword,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Registration failed');
        onSuccess(json.data.user, json.data.sessionToken);
      }

      // 3. Doctor Login
      else if (mode === 'doctor-login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
            requestedRole: 'doctor',
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Login failed');
        onSuccess(json.data.user, json.data.sessionToken);
      }

      // 4. Doctor Registration (Requirement 7 & 8)
      else if (mode === 'doctor-register') {
        if (doctorPassword !== doctorConfirmPassword) {
          throw new Error('Passwords do not match. Please verify your password entry.');
        }
        const res = await fetch('/api/auth/doctor/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: doctorName,
            email: doctorEmail,
            mobile: doctorMobile,
            specialization: doctorSpecialization,
            qualification: doctorQualification,
            experience: doctorExperience,
            licenseNumber: doctorLicenseNumber,
            password: doctorPassword,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Doctor registration failed');
        onSuccess(json.data.user, json.data.sessionToken);
      }

      // 5. Staff Login
      else if (mode === 'staff-login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
            requestedRole: 'staff',
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Staff authentication failed');
        onSuccess(json.data.user, json.data.sessionToken);
      }

      // 6. Forgot Password
      else if (mode === 'forgot-password') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to dispatch reset email');
        setSuccessMessage(json.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Navigation Selector: Patient / Doctor / Staff */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex">
          <button
            type="button"
            onClick={() => {
              setMode('patient-login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              mode.startsWith('patient')
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('doctor-login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              mode.startsWith('doctor')
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('staff-login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              mode === 'staff-login'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Staff Login</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 sm:p-10 space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-1">
              {mode.startsWith('patient') ? (
                <User className="w-6 h-6" />
              ) : mode.startsWith('doctor') ? (
                <Stethoscope className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {mode === 'patient-login' && 'Patient Sign In'}
              {mode === 'patient-register' && 'Patient Account Registration'}
              {mode === 'doctor-login' && 'Physician Sign In'}
              {mode === 'doctor-register' && 'Physician Medical Credential Registration'}
              {mode === 'staff-login' && 'Clinical Staff Authorization'}
              {mode === 'forgot-password' && 'Reset Account Password'}
            </h2>

            <p className="text-xs text-slate-500 font-medium">
              {mode.startsWith('patient') && 'Access your symptoms triage history, intake consultations and bookings.'}
              {mode.startsWith('doctor') && 'Inspect assigned clinic schedules, patient encounters and clinical notes.'}
              {mode === 'staff-login' && 'Lead clinicians and administrative staff command center.'}
              {mode === 'forgot-password' && 'Enter your verified email to receive secure recovery instructions.'}
            </p>
          </div>

          {/* Sub-Switch: Login vs Register */}
          {mode.startsWith('patient') && (
            <div className="flex border-b border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('patient-login')}
                className={`flex-1 pb-3 text-center border-b-2 transition-colors ${
                  mode === 'patient-login'
                    ? 'border-teal-600 text-teal-600 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('patient-register')}
                className={`flex-1 pb-3 text-center border-b-2 transition-colors ${
                  mode === 'patient-register'
                    ? 'border-teal-600 text-teal-600 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Create Patient Account
              </button>
            </div>
          )}

          {mode.startsWith('doctor') && (
            <div className="flex border-b border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('doctor-login')}
                className={`flex-1 pb-3 text-center border-b-2 transition-colors ${
                  mode === 'doctor-login'
                    ? 'border-teal-600 text-teal-600 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Physician Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('doctor-register')}
                className={`flex-1 pb-3 text-center border-b-2 transition-colors ${
                  mode === 'doctor-register'
                    ? 'border-teal-600 text-teal-600 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Register as Doctor
              </button>
            </div>
          )}

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. PATIENT REGISTRATION FIELDS */}
            {mode === 'patient-register' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Legal Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Eleanor Hughes"
                      className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        value={patientMobile}
                        onChange={(e) => setPatientMobile(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Birth *</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="date"
                        required
                        value={patientDob}
                        onChange={(e) => setPatientDob(e.target.value)}
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Gender *</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={patientPassword}
                        onChange={(e) => setPatientPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={patientConfirmPassword}
                        onChange={(e) => setPatientConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 2. DOCTOR REGISTRATION FIELDS */}
            {mode === 'doctor-register' && (
              <>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start space-x-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    New physician registrations will be marked <strong>PENDING_VERIFICATION</strong> and reviewed by clinic staff prior to appointment calendar activation.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Physician Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. Marcus Vance"
                      className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={doctorEmail}
                        onChange={(e) => setDoctorEmail(e.target.value)}
                        placeholder="doctor@pulseclinic.internal"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        value={doctorMobile}
                        onChange={(e) => setDoctorMobile(e.target.value)}
                        placeholder="+1 (555) 432-8765"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Specialty *</label>
                    <select
                      value={doctorSpecialization}
                      onChange={(e) => setDoctorSpecialization(e.target.value as DoctorSpecialty)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="Cardiologist">Cardiologist</option>
                      <option value="General Physician">General Physician</option>
                      <option value="Dermatologist">Dermatologist</option>
                      <option value="Orthopedic">Orthopedic</option>
                      <option value="Pediatrician">Pediatrician</option>
                      <option value="Neurologist">Neurologist</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Medical License Number *</label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={doctorLicenseNumber}
                        onChange={(e) => setDoctorLicenseNumber(e.target.value)}
                        placeholder="MD-STATE-89214"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Qualification *</label>
                    <input
                      type="text"
                      required
                      value={doctorQualification}
                      onChange={(e) => setDoctorQualification(e.target.value)}
                      placeholder="e.g. MD, MBBS, Fellowship"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Experience *</label>
                    <input
                      type="text"
                      required
                      value={doctorExperience}
                      onChange={(e) => setDoctorExperience(e.target.value)}
                      placeholder="e.g. 8 years"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={doctorPassword}
                        onChange={(e) => setDoctorPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={doctorConfirmPassword}
                        onChange={(e) => setDoctorConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 3. LOGIN FIELDS (PATIENT / DOCTOR / STAFF) */}
            {(mode === 'patient-login' || mode === 'doctor-login' || mode === 'staff-login') && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={
                        mode === 'patient-login'
                          ? 'eleanor.hughes@example.com'
                          : mode === 'doctor-login'
                          ? 'dr.vance@pulseclinic.internal'
                          : 'staff@pulseclinic.internal'
                      }
                      className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setMode('forgot-password');
                      }}
                      className="text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 4. FORGOT PASSWORD FIELDS */}
            {mode === 'forgot-password' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Your Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs tracking-wide transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'patient-login' && 'Sign In as Patient'}
                    {mode === 'patient-register' && 'Complete Patient Registration'}
                    {mode === 'doctor-login' && 'Sign In to Doctor Dashboard'}
                    {mode === 'doctor-register' && 'Submit Doctor Credentials'}
                    {mode === 'staff-login' && 'Access Staff Command Center'}
                    {mode === 'forgot-password' && 'Send Password Reset Link'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>
                  {mode.startsWith('patient') && 'Demo Patient Account'}
                  {mode.startsWith('doctor') && 'Demo Physician Accounts'}
                  {mode === 'staff-login' && 'Demo Staff Account'}
                  {mode === 'forgot-password' && 'Instant Demo Access'}
                </span>
              </span>
              <span className="text-[10px] text-slate-400">Pre-seeded authentication</span>
            </div>

            {/* Strictly Separated Demo Logins: Patient shows Eleanor & Liam; Doctor shows all 6 doctors */}
            {mode.startsWith('patient') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickFill('patient-eleanor')}
                  className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-white hover:border-teal-400 text-left transition-colors flex flex-col justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Eleanor Hughes</span>
                    <span className="text-[11px] text-teal-700">Patient • Hypertension</span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md mt-1.5 inline-block w-fit">
                    Demo Sign-In
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('patient-liam')}
                  className="p-2.5 rounded-xl border border-teal-200 bg-teal-50/70 hover:bg-white hover:border-teal-400 text-left transition-colors flex flex-col justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Liam Henderson</span>
                    <span className="text-[11px] text-teal-700">Patient • Mild Asthma</span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md mt-1.5 inline-block w-fit">
                    Demo Sign-In
                  </span>
                </button>
              </div>
            )}

            {mode.startsWith('doctor') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickFill('doc-vance')}
                  className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-white hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="font-bold text-slate-900 block text-xs">Dr. Marcus Vance</span>
                  <span className="text-cyan-700 block mt-0.5 font-medium">Cardiology</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('doc-mitchell')}
                  className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-white hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="font-bold text-slate-900 block text-xs">Dr. Sarah Mitchell</span>
                  <span className="text-cyan-700 block mt-0.5 font-medium">Dermatology</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('doc-wilson')}
                  className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-white hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="font-bold text-slate-900 block text-xs">Dr. James Wilson</span>
                  <span className="text-cyan-700 block mt-0.5 font-medium">General Medicine</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('doc-carter')}
                  className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-white hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="font-bold text-slate-900 block text-xs">Dr. Emily Carter</span>
                  <span className="text-cyan-700 block mt-0.5 font-medium">Pediatrics</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('doc-anderson')}
                  className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-white hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="font-bold text-slate-900 block text-xs">Dr. Robert Anderson</span>
                  <span className="text-cyan-700 block mt-0.5 font-medium">Orthopedics</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('doc-martinez')}
                  className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-white hover:border-cyan-400 text-left transition-colors"
                >
                  <span className="font-bold text-slate-900 block text-xs">Dr. Sophia Martinez</span>
                  <span className="text-cyan-700 block mt-0.5 font-medium">Neurology</span>
                </button>
              </div>
            )}

            {mode === 'staff-login' && (
              <button
                type="button"
                onClick={() => handleQuickFill('staff')}
                className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-white hover:border-purple-400 text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Dr. Sarah Jenkins</span>
                  <span className="text-[11px] text-purple-700">Clinical Staff Lead • Admin</span>
                </div>
                <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg">
                  Instant Staff Access
                </span>
              </button>
            )}

            {mode === 'forgot-password' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('patient-eleanor')}
                  className="flex-1 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-left text-xs transition-colors"
                >
                  <span className="font-bold text-slate-900 block">Eleanor Hughes</span>
                  <span className="text-slate-500 text-[10px]">eleanor.hughes@example.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('patient-liam')}
                  className="flex-1 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-left text-xs transition-colors"
                >
                  <span className="font-bold text-slate-900 block">Liam Henderson</span>
                  <span className="text-slate-500 text-[10px]">liam.henderson@example.com</span>
                </button>
              </div>
            )}
          </div>

          {/* Firebase Environment Notice */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${firebaseStatus?.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>Backend Database: Cloud Firestore</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{firebaseStatus?.projectId || 'pulseclinic-ai'}</span>
            </div>
            {firebaseStatus && !firebaseStatus.configured ? (
              <p className="text-amber-800 text-[10px] leading-relaxed">
                <strong>Firebase Notice:</strong> To enable direct Google Cloud service account authentication, configure{' '}
                <code className="bg-white px-1 py-0.5 rounded border font-mono">FIREBASE_CLIENT_EMAIL</code> and{' '}
                <code className="bg-white px-1 py-0.5 rounded border font-mono">FIREBASE_PRIVATE_KEY</code> in environment variables.
                Local Firestore RBAC session layer is currently running.
              </p>
            ) : (
              <p className="text-emerald-700 text-[10px]">
                Active Cloud Firestore persistence with strict RBAC rules for Patients, Doctors, and Staff.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
