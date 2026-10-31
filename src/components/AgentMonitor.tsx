import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  Database,
  Globe,
  Mail,
  Calendar,
} from 'lucide-react';
import { AgentExecutionLog, SystemIntegrationsStatus } from '../types/index.ts';

interface AgentMonitorProps {
  executionLogs: AgentExecutionLog[];
  systemStatus: SystemIntegrationsStatus | null;
  onRefreshData: () => void;
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({
  executionLogs,
  systemStatus,
  onRefreshData,
}) => {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    executionLogs.length > 0 ? executionLogs[0].id : null
  );
  const [testDoctorId, setTestDoctorId] = useState('doc-gp-1');
  const [browserbaseTesting, setBrowserbaseTesting] = useState(false);
  const [bbTestResult, setBbTestResult] = useState<any>(null);

  const selectedLog = executionLogs.find((l) => l.id === selectedLogId) || executionLogs[0];

  // Manual Trigger for Browserbase Cloud Automation Test
  const handleTestBrowserbase = async () => {
    setBrowserbaseTesting(true);
    setBbTestResult(null);
    try {
      const res = await fetch('/api/browserbase/check-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: testDoctorId }),
      });
      const data = await res.json();
      setBbTestResult(data.data);
    } catch (err: any) {
      setBbTestResult({ error: err.message, status: 'ERROR' });
    } finally {
      setBrowserbaseTesting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Observability Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-slate-900 text-teal-400 font-mono font-bold px-2 py-0.5 rounded-full">
              AGENT OBSERVABILITY & TRACE
            </span>
            <span className="text-xs text-slate-500">Autonomous Execution Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Gemini Multi-Step Agentic Workflow & Tool Telemetry
          </h1>
        </div>

        <button
          onClick={onRefreshData}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live Traces</span>
        </button>
      </div>

      {/* 5 Real Integration Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Gemini API */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center">
              <Cpu className="w-4 h-4 mr-1 text-teal-600" />
              Gemini AI
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                systemStatus?.gemini.connected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {systemStatus?.gemini.connected ? 'ACTIVE' : 'DETERMINISTIC'}
            </span>
          </div>
          <p className="text-xs text-slate-600">Model: {systemStatus?.gemini.model}</p>
          <p className="text-[11px] text-slate-400">Natural language clinical reasoning & 14 tools</p>
        </div>

        {/* Browserbase */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center">
              <Globe className="w-4 h-4 mr-1 text-cyan-600" />
              Browserbase
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                systemStatus?.browserbase.connected
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {systemStatus?.browserbase.connected ? 'ACTIVE' : 'NOT CONNECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate">{systemStatus?.browserbase.info}</p>
          <p className="text-[11px] text-slate-400">Cloud headless browser verification</p>
        </div>

        {/* Resend Email */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center">
              <Mail className="w-4 h-4 mr-1 text-blue-600" />
              Resend API
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                systemStatus?.resend.connected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {systemStatus?.resend.connected ? 'ACTIVE' : 'NOT CONNECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate">{systemStatus?.resend.info}</p>
          <p className="text-[11px] text-slate-400">Idempotent confirmation & rebooking emails</p>
        </div>

        {/* Cloud Firestore */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center">
              <Database className="w-4 h-4 mr-1 text-purple-600" />
              Firestore
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
              PERSISTENT
            </span>
          </div>
          <p className="text-xs text-slate-600">Strict RBAC & Audit Collections</p>
          <p className="text-[11px] text-slate-400">Patient memory across visits</p>
        </div>

        {/* Calendar REST API */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-emerald-600" />
              Calendar API
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-600">Atomic Concurrency Slot Locks</p>
          <p className="text-[11px] text-slate-400">Prevents double booking</p>
        </div>
      </div>

      {/* Interactive Tool Test: Browserbase Schedule Inspector */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono uppercase px-2 py-0.5 rounded-md border border-teal-500/30">
              Backend Tool Execution
            </span>
            <h3 className="text-base font-bold mt-1">
              browserbase_check_schedule (Cloud Headless Inspection)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Spawns real cloud browser session to navigate to clinic doctor calendar page and capture DOM observations.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={testDoctorId}
              onChange={(e) => setTestDoctorId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl"
            >
              <option value="doc-gp-1">Dr. Jenkins (General)</option>
              <option value="doc-cardio-1">Dr. Vance (Cardiology)</option>
              <option value="doc-derm-1">Dr. Rostova (Dermatology)</option>
              <option value="doc-ortho-1">Dr. Chen (Orthopedic)</option>
              <option value="doc-peds-1">Dr. Okafor (Pediatric)</option>
              <option value="doc-neuro-1">Dr. Sterling (Neurology)</option>
            </select>

            <button
              onClick={handleTestBrowserbase}
              disabled={browserbaseTesting}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {browserbaseTesting ? 'Running Session...' : 'Execute Tool'}
            </button>
          </div>
        </div>

        {bbTestResult && (
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-teal-500/30 text-xs font-mono space-y-1.5 text-teal-200">
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Session ID: {bbTestResult.sessionId}</span>
              <span>Status: {bbTestResult.status}</span>
            </div>
            <p className="text-slate-200">{bbTestResult.observations}</p>
            {bbTestResult.liveDebugUrl && (
              <a
                href={bbTestResult.liveDebugUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-teal-400 hover:underline pt-1 text-[11px]"
              >
                Open Live Browserbase Session Inspector <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {bbTestResult.error && (
              <p className="text-amber-300 text-[11px]">Note: {bbTestResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Main Execution Traces & Stage Loop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Execution Session Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>Execution Logs ({executionLogs.length})</span>
            <span className="text-xs text-slate-400">Chronological</span>
          </h3>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {executionLogs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  selectedLog?.id === log.id
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs ring-1 ring-teal-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>{log.id}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${
                      log.overallStatus === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.overallStatus === 'ESCALATED_EMERGENCY'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {log.overallStatus}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">
                  "{log.userPrompt}"
                </p>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>{log.steps.length} Agent Steps</span>
                  <span>{new Date(log.startedAt).toLocaleTimeString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Step-by-Step Plan-Act-Observe-RePlan-Verify Pipeline (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {selectedLog ? (
            <div>
              <div className="border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                  <span>Session: {selectedLog.sessionId}</span>
                  <span>•</span>
                  <span>Patient: {selectedLog.patientId || 'Intake'}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  User Prompt: <span className="font-normal text-slate-700">"{selectedLog.userPrompt}"</span>
                </h3>
              </div>

              {/* Step Sequence */}
              <div className="space-y-4">
                {selectedLog.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-mono flex items-center justify-center text-[10px] font-bold">
                          {step.stepNumber}
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                            step.stage === 'PLAN'
                              ? 'bg-blue-100 text-blue-800'
                              : step.stage === 'ACT'
                              ? 'bg-purple-100 text-purple-800'
                              : step.stage === 'OBSERVE'
                              ? 'bg-amber-100 text-amber-800'
                              : step.stage === 'RE-PLAN'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          STAGE: {step.stage}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium">{step.description}</p>

                    {/* Tool Call Arguments if present */}
                    {step.toolCall && (
                      <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] space-y-1">
                        <span className="text-teal-400 font-bold block">
                          Tool Call: {step.toolCall.name}()
                        </span>
                        <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(step.toolCall.args, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Tool Result if present */}
                    {step.toolResult && (
                      <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-lg font-mono text-[11px]">
                        <span className="text-slate-700 font-bold block">
                          Tool Execution Result (Status: {step.toolResult.success ? 'SUCCESS' : 'FAILED'})
                        </span>
                        <pre className="text-slate-600 overflow-x-auto whitespace-pre-wrap mt-0.5">
                          {JSON.stringify(step.toolResult.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              No execution trace selected. Interact with the chat or run evaluation test suite to generate traces.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
