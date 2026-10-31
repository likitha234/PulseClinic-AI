import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  ShieldCheck,
  RefreshCw,
  FileText,
  Download,
  Play,
  Info,
  Layers,
  Check,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import {
  CsvImportSummary,
  CsvTargetCollection,
  CsvTestSuiteResult,
} from '../types/index.ts';

interface CsvDataImportViewProps {
  onRefreshParentData: () => void;
  currentUserRole?: 'patient' | 'staff' | 'admin';
}

export const CsvDataImportView: React.FC<CsvDataImportViewProps> = ({
  onRefreshParentData,
  currentUserRole = 'staff',
}) => {
  const [selectedCollection, setSelectedCollection] = useState<CsvTargetCollection | 'auto'>('auto');
  const [uploading, setUploading] = useState(false);
  const [importingSamples, setImportingSamples] = useState(false);
  const [verifyingFirestore, setVerifyingFirestore] = useState(false);
  const [runningTests, setRunningTests] = useState(false);

  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testSuiteResults, setTestSuiteResults] = useState<{ allPassed: boolean; results: CsvTestSuiteResult[] } | null>(null);

  const [firestoreStats, setFirestoreStats] = useState<{
    connected: boolean;
    projectId: string;
    collections: Record<string, { count: number; sampleIds: string[] }>;
    verifiedAt?: string;
  } | null>(null);

  const [sampleTemplates, setSampleTemplates] = useState<{ fileName: string; content: string; sizeBytes: number }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live Firestore stats and sample CSV list on mount
  useEffect(() => {
    fetchFirestoreStats();
    fetchSampleTemplates();
  }, []);

  const fetchFirestoreStats = async () => {
    setVerifyingFirestore(true);
    try {
      const res = await fetch('/api/staff/csv/verify');
      const data = await res.json();
      if (data.success || data.collections) {
        setFirestoreStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch Firestore stats:', err);
    } finally {
      setVerifyingFirestore(false);
    }
  };

  const fetchSampleTemplates = async () => {
    try {
      const res = await fetch('/api/staff/csv/samples');
      const data = await res.json();
      if (data.success && data.samples) {
        setSampleTemplates(data.samples);
      }
    } catch (err) {
      console.error('Failed to load sample CSV templates:', err);
    }
  };

  // Upload custom CSV files
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMessage(null);

    try {
      const filePayloads = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith('.csv')) {
          setErrorMessage(`File '${file.name}' is not a CSV file. Only .csv files are supported.`);
          setUploading(false);
          return;
        }

        const text = await file.text();
        filePayloads.push({
          fileName: file.name,
          csvContent: text,
          targetCollection: selectedCollection === 'auto' ? undefined : selectedCollection,
        });
      }

      const res = await fetch('/api/staff/csv/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': currentUserRole,
        },
        body: JSON.stringify({
          files: filePayloads,
          userRole: currentUserRole,
        }),
      });

      const data = await res.json();
      if (data.error && !data.fileResults) {
        setErrorMessage(data.error);
      } else {
        setImportSummary(data);
        fetchFirestoreStats();
        onRefreshParentData();
      }
    } catch (err: any) {
      setErrorMessage(`Import request failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 1-Click Import All Pre-extracted Sample CSVs in Relational Order
  const handleImportAllSamples = async () => {
    setImportingSamples(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/staff/csv/import-samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': currentUserRole,
        },
        body: JSON.stringify({ userRole: currentUserRole }),
      });

      const data = await res.json();
      if (data.error && !data.fileResults) {
        setErrorMessage(data.error);
      } else {
        setImportSummary(data);
        fetchFirestoreStats();
        onRefreshParentData();
      }
    } catch (err: any) {
      setErrorMessage(`Sample import failed: ${err.message}`);
    } finally {
      setImportingSamples(false);
    }
  };

  // Run Automated CSV Import Tests (Duplicates, Overwrite Protection, Invalid CSVs)
  const handleRunTestSuite = async () => {
    setRunningTests(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/staff/csv/test-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': currentUserRole,
        },
        body: JSON.stringify({ userRole: currentUserRole }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setTestSuiteResults(data.data);
        fetchFirestoreStats();
      } else {
        setErrorMessage(data.error || 'Test suite execution failed.');
      }
    } catch (err: any) {
      setErrorMessage(`Test suite error: ${err.message}`);
    } finally {
      setRunningTests(false);
    }
  };

  // Download template CSV to user's computer
  const handleDownloadTemplate = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isStaff = currentUserRole === 'staff' || currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Access Control & Security Notice */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-teal-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Role-Based Access Control: {isStaff ? 'Staff Authorized' : 'Read Only'}
            </span>
            <span className="text-xs text-slate-400">Zero-Leak Admin Architecture</span>
          </div>
          <h2 className="text-lg font-bold mt-1 text-white">
            Secure CSV Data Import & Cloud Firestore Synchronization
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Strict header and type validation, duplicate record protection, real patient overwrite prevention, and automated relational linking into Cloud Firestore.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchFirestoreStats}
            disabled={verifyingFirestore}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifyingFirestore ? 'animate-spin' : ''}`} />
            <span>Verify Cloud Firestore</span>
          </button>
        </div>
      </div>

      {/* Access Denied Warning if Not Staff */}
      {!isStaff && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center space-x-3 text-amber-900 text-xs">
          <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Staff Access Required:</span> You are currently viewing as a patient. Switch to Staff Mode in the top header switcher to execute imports into Cloud Firestore.
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start space-x-3 text-red-900 text-xs animate-shake">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Import Error: </span>
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Main Grid: Upload Zone + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                <span>Upload CSV Data Files</span>
              </h3>
              <p className="text-xs text-slate-500">
                Supports single or multiple CSV files for batch Firestore ingestion.
              </p>
            </div>

            {/* Target Collection Selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Target Collection:</span>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs"
              >
                <option value="auto">Auto-detect from Filename/Headers</option>
                <option value="patients">patients</option>
                <option value="medical_history">medical_history</option>
                <option value="doctors">doctors</option>
                <option value="doctor_availability">doctor_availability</option>
                <option value="appointments">appointments</option>
                <option value="triage_test_data">triage_test_data</option>
                <option value="evaluation_test_cases">evaluation_test_cases</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFileUpload(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive
                ? 'border-teal-500 bg-teal-50/60'
                : 'border-slate-300 hover:border-teal-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              disabled={!isStaff || uploading}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className={`flex flex-col items-center justify-center cursor-pointer ${
                !isStaff || uploading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shadow-sm mb-3">
                <UploadCloud className={`w-7 h-7 ${uploading ? 'animate-bounce' : ''}`} />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {uploading ? 'Validating and Importing into Firestore...' : 'Click to select CSV or drag and drop files here'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Expected CSV files: <code className="text-teal-700 bg-teal-50 px-1 rounded">patients.csv</code>,{' '}
                <code className="text-teal-700 bg-teal-50 px-1 rounded">medical_history.csv</code>,{' '}
                <code className="text-teal-700 bg-teal-50 px-1 rounded">doctors.csv</code>,{' '}
                <code className="text-teal-700 bg-teal-50 px-1 rounded">doctor_availability.csv</code>,{' '}
                <code className="text-teal-700 bg-teal-50 px-1 rounded">appointments.csv</code>,{' '}
                <code className="text-teal-700 bg-teal-50 px-1 rounded">triage_test_data.csv</code>,{' '}
                <code className="text-teal-700 bg-teal-50 px-1 rounded">agent_evaluation_test_cases.csv</code>.
              </p>
            </label>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleImportAllSamples}
                disabled={!isStaff || importingSamples}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-60"
              >
                <Layers className={`w-4 h-4 ${importingSamples ? 'animate-spin' : ''}`} />
                <span>{importingSamples ? 'Importing All 7 Files...' : '1-Click Import All 7 Sample CSVs'}</span>
              </button>

              <button
                onClick={handleRunTestSuite}
                disabled={!isStaff || runningTests}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-60"
              >
                <Play className={`w-3.5 h-3.5 text-emerald-400 ${runningTests ? 'animate-spin' : ''}`} />
                <span>{runningTests ? 'Executing Test Suite...' : 'Run Automated CSV Test Suite'}</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              Writes strictly via server-side Firebase Admin SDK
            </span>
          </div>
        </div>

        {/* Live Cloud Firestore Status Panel (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Database className="w-4 h-4 text-purple-600" />
                <span>Live Cloud Firestore Verification</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Project: <span className="font-mono text-slate-800 font-semibold">{firestoreStats?.projectId || 'pulseclinic-ai'}</span>
            </p>

            <div className="mt-4 space-y-2 text-xs">
              {[
                { name: 'patients', label: 'patients' },
                { name: 'medical_history', label: 'medical_history' },
                { name: 'doctors', label: 'doctors' },
                { name: 'doctor_availability', label: 'doctor_availability' },
                { name: 'appointments', label: 'appointments' },
                { name: 'triage_test_data', label: 'triage_test_data' },
                { name: 'evaluation_test_cases', label: 'evaluation_test_cases' },
              ].map(({ name, label }) => {
                const info = firestoreStats?.collections?.[name];
                const count = info?.count ?? 0;
                return (
                  <div key={name} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-mono text-slate-700">{label}</span>
                    <span className="font-bold text-slate-900 flex items-center space-x-1">
                      <span>{count} docs</span>
                      {count > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Verified: {firestoreStats?.verifiedAt ? new Date(firestoreStats.verifiedAt).toLocaleTimeString() : 'Active'}</span>
            <span className="text-teal-600 font-medium">Real Cloud DB</span>
          </div>
        </div>
      </div>

      {/* Automated Test Suite Results Card */}
      {testSuiteResults && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    testSuiteResults.allPassed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {testSuiteResults.allPassed ? 'ALL TESTS PASSED (6/6)' : 'FAILURES DETECTED'}
                </span>
                <span className="text-xs text-slate-500">Security & Integrity Verification</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Automated CSV Import Test Suite Results
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {testSuiteResults.results.map((res, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                  res.passed ? 'bg-emerald-50/40 border-emerald-200 text-slate-800' : 'bg-red-50/50 border-red-200 text-red-900'
                }`}
              >
                {res.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{res.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{res.details}</p>
                  {res.error && <p className="text-[10px] text-red-600 font-mono mt-1">Error: {res.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Summary Results Card */}
      {importSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-200">
                  Import Ingestion Complete
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(importSummary.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Firestore Data Ingestion Summary
              </h3>
            </div>

            {/* Quick counters */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                Imported: {importSummary.totalImported}
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                Skipped (Duplicates): {importSummary.totalSkipped}
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800 font-semibold">
                Failed: {importSummary.totalFailed}
              </div>
            </div>
          </div>

          {/* Breakdown per file */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">File Name</th>
                  <th className="py-2.5 px-3 font-semibold">Firestore Collection</th>
                  <th className="py-2.5 px-3 font-semibold">Total Rows</th>
                  <th className="py-2.5 px-3 font-semibold text-emerald-700">Imported</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-600">Skipped</th>
                  <th className="py-2.5 px-3 font-semibold text-red-600">Failed</th>
                  <th className="py-2.5 px-3 font-semibold">Sample Document IDs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {importSummary.fileResults.map((fr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-900 flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{fr.fileName}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-purple-700 font-semibold">{fr.targetCollection}</td>
                    <td className="py-3 px-3">{fr.totalRows}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">
                      {fr.importedCount > 0 ? `+${fr.importedCount}` : 0}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{fr.skippedCount}</td>
                    <td className="py-3 px-3">
                      {fr.failedCount > 0 ? (
                        <span className="font-bold text-red-600">{fr.failedCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                      {fr.sampleImportedIds.length > 0 ? (
                        fr.sampleImportedIds.join(', ')
                      ) : (
                        <span className="text-slate-400 italic">None imported (existing)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Validation Errors List if any */}
          {importSummary.fileResults.some((fr) => fr.errors.length > 0) && (
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-2">
              <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Encountered Row Notices & Validation Messages:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-[11px]">
                {importSummary.fileResults.flatMap((fr) =>
                  fr.errors.map((err, errIdx) => (
                    <li key={`${fr.fileName}-${errIdx}`}>
                      <strong className="text-slate-900">{fr.fileName}</strong>{' '}
                      {err.row > 0 ? `(Line ${err.row})` : ''}: {err.reason}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Available Pre-extracted CSV Templates & Downloads */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Download className="w-4 h-4 text-teal-600" />
            <span>Pre-Extracted CSV Templates & Benchmark Data</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download sample CSV files, inspect schemas, or customize them before uploading.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {sampleTemplates.map((template) => (
            <div
              key={template.fileName}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex flex-col justify-between space-y-3 transition-colors"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="font-bold text-slate-900">{template.fileName}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Size: {(template.sizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>

              <button
                onClick={() => handleDownloadTemplate(template.fileName, template.content)}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-semibold text-[11px] flex items-center justify-center space-x-1 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Download Template CSV</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
