import React from 'react';
import {
  UserCheck,
  ShieldAlert,
  Cpu,
  Stethoscope,
  Terminal,
} from 'lucide-react';
import { SystemIntegrationsStatus } from '../types/index.ts';

interface HeaderProps {
  activeTab: 'patient' | 'staff' | 'agent' | 'evaluation';
  setActiveTab: (tab: 'patient' | 'staff' | 'agent' | 'evaluation') => void;
  systemStatus: SystemIntegrationsStatus | null;
  currentUser: {
    name: string;
    role: 'patient' | 'staff';
    isReturning?: boolean;
    email?: string;
  };
  onSwitchUser: (role: 'patient' | 'staff', isReturning?: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  currentUser,
  onSwitchUser,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('patient')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">PulseClinic <span className="text-teal-600">AI</span></span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Clinical SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Intelligent Patient Intake, Triage & Appointment Booking</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('patient')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'patient'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Patient Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'staff'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Staff Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'agent'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Agent Monitor</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'evaluation'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">Evaluation Engine</span>
              <span className="sm:hidden">Tests</span>
            </button>
          </nav>

          {/* Quick Role / User Switcher */}
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-200 text-xs">
            <span className="text-slate-400">Viewing as:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => onSwitchUser('patient', true)}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  currentUser.role === 'patient' && currentUser.isReturning
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Eleanor Hughes (Returning patient with prior history)"
              >
                Eleanor (Returning)
              </button>
              <button
                onClick={() => onSwitchUser('patient', false)}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  currentUser.role === 'patient' && !currentUser.isReturning
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="New Patient Intake"
              >
                New Patient
              </button>
              <button
                onClick={() => onSwitchUser('staff')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  currentUser.role === 'staff'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Clinical Staff Member"
              >
                Staff Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
