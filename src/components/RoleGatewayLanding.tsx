import React from 'react';
import {
  UserCheck,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Lock,
  FileText,
  Calendar,
  AlertTriangle,
  HeartPulse,
  Database,
  CheckCircle2,
  ChevronRight,
  Users,
} from 'lucide-react';
import { AuthMode } from './AuthView.tsx';

interface RoleGatewayLandingProps {
  onSelectRole: (mode: AuthMode) => void;
  onQuickDemoLogin?: (role: 'patient' | 'doctor' | 'staff') => void;
}

export const RoleGatewayLanding: React.FC<RoleGatewayLandingProps> = ({
  onSelectRole,
  onQuickDemoLogin,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Hero Welcome Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Role-Based Healthcare Platform</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Welcome to <span className="text-teal-600">PulseClinic AI</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Intelligent patient intake, clinical symptom triage & autonomous appointment scheduling.
          Please select your portal below to sign in or register with verified credentials.
        </p>
      </div>

      {/* Direct Authentication Gateways Section: Patient, Doctor, Staff */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Gateway Selection Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-teal-400">Direct Portal Gateway</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">Select Your Access Portal</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Access your personalized workspace with role-based credentials. Instant demo access available for verified accounts.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-teal-300 bg-teal-900/40 border border-teal-700/50 px-3.5 py-1.5 rounded-full w-fit">
              <Lock className="w-3.5 h-3.5" />
              <span>End-to-End Encrypted Session</span>
            </div>
          </div>
        </div>

        {/* 3 Portal Panels Directly Displayed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* PANEL 1: PATIENT PORTAL */}
          <div className="p-6 sm:p-8 flex flex-col justify-between bg-white hover:bg-slate-50/50 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100/70 text-teal-800">
                  Patients
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Patient Portal</h3>
                <p className="text-xs text-slate-500 mt-1">
                  AI symptom intake, health check-in & appointments
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onSelectRole('patient-login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Patient Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onSelectRole('patient-register')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Create Patient Account</span>
                </button>
              </div>

              {/* Demo Accounts */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Patient Demo Accounts
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (onQuickDemoLogin) onQuickDemoLogin('patient');
                      else onSelectRole('patient-login');
                    }}
                    className="p-2 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-colors"
                  >
                    <span className="font-bold text-slate-900 block text-[11px]">Eleanor Hughes</span>
                    <span className="text-[10px] text-teal-700">Hypertension</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectRole('patient-login');
                    }}
                    className="p-2 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-colors"
                  >
                    <span className="font-bold text-slate-900 block text-[11px]">Liam Henderson</span>
                    <span className="text-[10px] text-teal-700">Mild Asthma</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Multilingual conversational intake (EN, TE, HI)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Automated doctor approval workflow</span>
              </div>
            </div>
          </div>

          {/* PANEL 2: DOCTOR PORTAL */}
          <div className="p-6 sm:p-8 flex flex-col justify-between bg-white hover:bg-slate-50/50 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-100/70 text-cyan-800">
                  Physicians
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Doctor Portal</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Appointment review, triage assessment & handoff
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onSelectRole('doctor-login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Physician Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onSelectRole('doctor-register')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Register as Doctor</span>
                </button>
              </div>

              {/* Demo Doctors */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  6 Demo Physicians
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <button
                    onClick={() => onSelectRole('doctor-login')}
                    className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left"
                  >
                    <span className="font-bold text-slate-900 block truncate">Dr. Marcus Vance</span>
                    <span className="text-cyan-700">Cardiology</span>
                  </button>
                  <button
                    onClick={() => onSelectRole('doctor-login')}
                    className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left"
                  >
                    <span className="font-bold text-slate-900 block truncate">Dr. Sarah Mitchell</span>
                    <span className="text-cyan-700">Dermatology</span>
                  </button>
                  <button
                    onClick={() => onSelectRole('doctor-login')}
                    className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left"
                  >
                    <span className="font-bold text-slate-900 block truncate">Dr. James Wilson</span>
                    <span className="text-cyan-700">General Med</span>
                  </button>
                  <button
                    onClick={() => onSelectRole('doctor-login')}
                    className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left"
                  >
                    <span className="font-bold text-slate-900 block truncate">Dr. Emily Carter</span>
                    <span className="text-cyan-700">Pediatrics</span>
                  </button>
                  <button
                    onClick={() => onSelectRole('doctor-login')}
                    className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left"
                  >
                    <span className="font-bold text-slate-900 block truncate">Dr. Robert Anderson</span>
                    <span className="text-cyan-700">Orthopedics</span>
                  </button>
                  <button
                    onClick={() => onSelectRole('doctor-login')}
                    className="p-1.5 rounded-lg border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left"
                  >
                    <span className="font-bold text-slate-900 block truncate">Dr. Sophia Martinez</span>
                    <span className="text-cyan-700">Neurology</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>Pre-consultation AI clinical handoff summaries</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span>Multi-doctor reassignment on clinical decline</span>
              </div>
            </div>
          </div>

          {/* PANEL 3: STAFF LOGIN */}
          <div className="p-6 sm:p-8 flex flex-col justify-between bg-white hover:bg-slate-50/50 transition-colors">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100/70 text-purple-800">
                  Staff Lead
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Staff Login</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Red-flag safety oversight & clinic administration
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onSelectRole('staff-login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Staff Administration Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <div className="py-2.5 px-4 text-center text-xs text-slate-400">
                  Restricted to authorized clinic staff
                </div>
              </div>

              {/* Demo Account */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Staff Demo Account
                </span>
                <button
                  onClick={() => {
                    if (onQuickDemoLogin) onQuickDemoLogin('staff');
                    else onSelectRole('staff-login');
                  }}
                  className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Dr. Sarah Jenkins</span>
                    <span className="text-[11px] text-purple-700">Clinical Staff Administrator</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                    Instant Demo
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Emergency red-flag triage approvals</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Physician credential verification</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Protocol Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-teal-600 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-800">Role-Based Access Control</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Strict patient, doctor & staff isolation</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <Database className="w-5 h-5 text-cyan-600 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-800">Cloud Firestore Storage</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Persistent medical records & schedules</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <HeartPulse className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-800">Clinical Safety Guardrails</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Red-flag triage with zero unauthorized prescription</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-800">Autonomous Booking Engine</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Real-time doctor calendar synchronization</p>
        </div>
      </div>
    </div>
  );
};
