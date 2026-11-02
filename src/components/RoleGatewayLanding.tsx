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

      {/* 3 Persona Selection Cards (Requirement: Patient Portal, Doctor Portal, Staff Login) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* PERSONA 1: PATIENT PORTAL */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-500 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden group">
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100/60 text-teal-800 border border-teal-200">
                Patients & Families
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Patient Portal</h2>
              <p className="text-xs text-slate-500 mt-1">
                AI Intake, Symptom Checker & Scheduling
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Describe your symptoms conversationally with our clinical intake agent, receive instant urgency assessments, and autonomously book appointments with matching specialists.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Conversational symptom intake & red-flag detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Autonomous specialist matching & calendar booking</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Medical history records & instant confirmation emails</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
            <button
              onClick={() => onSelectRole('patient-login')}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <span>Patient Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectRole('patient-register')}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
            >
              <span>New Patient? Create Account</span>
            </button>
          </div>
        </div>

        {/* PERSONA 2: DOCTOR PORTAL */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-cyan-500 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden group">
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-100/60 text-cyan-800 border border-cyan-200">
                Medical Physicians
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Doctor Portal</h2>
              <p className="text-xs text-slate-500 mt-1">
                Clinical Schedule, Triage Review & Notes
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Dedicated clinical workspace for physicians to manage daily consultation queues, review pre-consultation triage assessments, and update schedules with automatic patient rebooking.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Daily appointment schedule & real-time queue</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Pre-intake triage summaries & red-flag alerts</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>Cancellation with 1-click autonomous patient rebooking</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
            <button
              onClick={() => onSelectRole('doctor-login')}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <span>Physician Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectRole('doctor-register')}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
            >
              <span>Register Doctor Account (License Required)</span>
            </button>
          </div>
        </div>

        {/* PERSONA 3: STAFF LOGIN */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-500 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden group">
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100/60 text-purple-800 border border-purple-200">
                Administration & Operations
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Staff Login</h2>
              <p className="text-xs text-slate-500 mt-1">
                Triage Safety Oversight & Operations
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Administrative console for clinic coordinators to manage emergency red-flag escalations, verify physician credentials, perform secure Firestore CSV imports, and audit agent workflows.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Emergency red-flag triage approvals & protocol oversight</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Physician credential verification & license validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Secure Firestore CSV imports & agent telemetry monitoring</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
            <button
              onClick={() => onSelectRole('staff-login')}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors shadow-sm flex items-center justify-center space-x-2"
            >
              <span>Staff Administration Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="py-2.5 px-4 text-center text-xs text-slate-500">
              Restricted to authorized clinical personnel
            </div>
          </div>
        </div>
      </div>

      {/* Quick Demo Access Bar (Helpful for test evaluators) */}
      {onQuickDemoLogin && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-teal-600" />
                <span>Fast Evaluation Mode (Quick Demo Access)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-configured verified test accounts for immediate role-based testing:
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => onQuickDemoLogin('patient')}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-teal-500 text-slate-700 hover:text-teal-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Eleanor Hughes (Patient)
              </button>
              <button
                onClick={() => onQuickDemoLogin('doctor')}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-cyan-500 text-slate-700 hover:text-cyan-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Dr. Marcus Vance (Doctor)
              </button>
              <button
                onClick={() => onQuickDemoLogin('staff')}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-purple-500 text-slate-700 hover:text-purple-700 text-xs font-semibold shadow-xs transition-colors"
              >
                Clinic Admin (Staff)
              </button>
            </div>
          </div>
        </div>
      )}

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
