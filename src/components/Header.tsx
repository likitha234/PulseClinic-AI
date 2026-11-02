import React, { useState } from 'react';
import {
  UserCheck,
  ShieldAlert,
  Cpu,
  Stethoscope,
  Terminal,
  LogOut,
  User,
  Shield,
  Lock,
  ChevronRight,
  Sparkles,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { SystemIntegrationsStatus, UserRole } from '../types/index.ts';

export type AppTab = 'landing' | 'patient' | 'doctor' | 'staff' | 'agent' | 'evaluation' | 'auth';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  systemStatus: SystemIntegrationsStatus | null;
  currentUser: {
    uid?: string;
    displayName?: string;
    name?: string;
    role: UserRole;
    isReturning?: boolean;
    email?: string;
    specialization?: string;
    status?: string;
  } | null;
  onLogout: () => void;
  onOpenAuth: (initialMode?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  currentUser,
  onLogout,
  onOpenAuth,
}) => {
  const userName = currentUser?.displayName || currentUser?.name || 'Guest User';
  const userRole = currentUser?.role;
  const isDoctor = userRole === 'doctor';
  const isStaff = userRole === 'staff' || userRole === 'admin';
  const isPatient = userRole === 'patient';
  const [showNotifications, setShowNotifications] = useState(false);

  const handleBrandClick = () => {
    if (!currentUser) {
      setActiveTab('landing');
    } else if (isDoctor) {
      setActiveTab('doctor');
    } else if (isStaff) {
      setActiveTab('staff');
    } else {
      setActiveTab('patient');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={handleBrandClick}
            title={currentUser ? 'Go to your dashboard' : 'Go to Portal Selection'}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  PulseClinic <span className="text-teal-600">AI</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Clinical SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Intelligent Patient Intake, Triage & Autonomous Booking
              </p>
            </div>
          </div>

          {/* Tab Navigation: ONLY shown when an authorized user is authenticated */}
          {currentUser ? (
            <nav className="flex space-x-1 sm:space-x-2">
              {/* Patient Role Navigation */}
              {isPatient && (
                <button
                  onClick={() => setActiveTab('patient')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 ${
                    activeTab === 'patient'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={`${userName}'s Dashboard`}
                >
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  <span>{userName}</span>
                </button>
              )}

              {/* Doctor Role Navigation */}
              {isDoctor && (
                <button
                  onClick={() => setActiveTab('doctor')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2 ${
                    activeTab === 'doctor'
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-cyan-600" />
                  <span>Doctor Portal</span>
                </button>
              )}

              {/* Staff / Admin Role Navigation */}
              {isStaff && (
                <>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-1.5 ${
                      activeTab === 'staff'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-600" />
                    <span>Staff Dashboard</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('agent')}
                    className={`hidden md:flex px-3 py-2 rounded-lg text-sm font-medium transition-colors items-center space-x-1.5 ${
                      activeTab === 'agent'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Cpu className="w-4 h-4 text-purple-600" />
                    <span>Agent Monitor</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('evaluation')}
                    className={`hidden lg:flex px-3 py-2 rounded-lg text-sm font-medium transition-colors items-center space-x-1.5 ${
                      activeTab === 'evaluation'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-purple-600" />
                    <span>Evaluation Engine</span>
                  </button>
                </>
              )}
            </nav>
          ) : (
            /* When Unauthenticated: NO PORTAL TABS ON TASKBAR */
            <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Secure Multi-Persona Healthcare Access</span>
            </div>
          )}

          {/* Right Actions: Authenticated User Chip OR 3 Separate Person Logins */}
          <div className="flex items-center space-x-2 sm:space-x-3 pl-3 border-l border-slate-200">
            {currentUser ? (
              <div className="flex items-center space-x-2.5 relative">
                {/* Master Prompt Requirement 3: Notification Bell in top Header with dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50/80 transition-colors relative"
                    title="Clinical Notifications & Alerts"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                  </button>

                  {/* Dropdown Popover */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <Bell className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-slate-900">Clinical Notifications</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                          2 Unread
                        </span>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-50 text-xs">
                        <div
                          onClick={() => {
                            setShowNotifications(false);
                            if (isPatient) setActiveTab('patient');
                          }}
                          className="pt-2 hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Cardiology Appointment Review</span>
                            <span className="text-[10px] text-slate-400">10m ago</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Dr. Marcus Vance is reviewing your requested consultation slot.
                          </p>
                        </div>

                        <div
                          onClick={() => {
                            setShowNotifications(false);
                            if (isPatient) setActiveTab('patient');
                          }}
                          className="pt-2 hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Monthly Check-in Available</span>
                            <span className="text-[10px] text-slate-400">1d ago</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Your 2-minute AI health check-in is due. Keep your vitals updated.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-center">
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            if (isPatient) setActiveTab('patient');
                            else if (isDoctor) setActiveTab('doctor');
                            else if (isStaff) setActiveTab('staff');
                          }}
                          className="text-[11px] text-teal-600 hover:text-teal-700 font-bold"
                        >
                          View Full Dashboard Details →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-xs font-bold text-slate-900">{userName}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        userRole === 'staff' || userRole === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : userRole === 'doctor'
                          ? currentUser?.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-cyan-100 text-cyan-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {userRole === 'doctor'
                        ? currentUser?.status === 'PENDING_VERIFICATION'
                          ? 'Doc (Pending)'
                          : 'Doctor'
                        : userRole === 'patient'
                        ? userName
                        : userRole?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">{currentUser.email || 'PulseCare User'}</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                  {userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>

                <button
                  onClick={onLogout}
                  title="Sign out of current account"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* When unauthenticated: 3 clearly separated persona login options */
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => onOpenAuth('patient-login')}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors flex items-center space-x-1"
                  title="Patient Portal Sign In"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Patient Login</span>
                </button>

                <button
                  onClick={() => onOpenAuth('doctor-login')}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-colors flex items-center space-x-1"
                  title="Doctor Portal Sign In"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Doctor Login</span>
                </button>

                <button
                  onClick={() => onOpenAuth('staff-login')}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors flex items-center space-x-1"
                  title="Staff Portal Sign In"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Staff Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
