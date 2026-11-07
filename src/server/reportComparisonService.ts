/**
 * PulseClinic AI - Medical Report Comparison & Biomarker Analysis Service
 * Longitudinal tracking, biomarker extraction, reference ranges, and trend calculation (HIGH/LOW/NORMAL)
 */

import {
  MedicalRecordReport,
  ReportBiomarkerComparison,
  BiomarkerStatus,
  BiomarkerTrend,
  BiomarkerValue,
} from '../types/index.ts';
import { PatientService } from './patientService.ts';

// Standard clinical biomarker reference ranges & thresholds
export const CLINICAL_BIOMARKER_STANDARDS: Record<
  string,
  {
    standardName: string;
    unit: string;
    normalMin: number;
    normalMax: number;
    criticalHigh?: number;
    referenceRangeText: string;
  }
> = {
  'total cholesterol': {
    standardName: 'Total Cholesterol',
    unit: 'mg/dL',
    normalMin: 125,
    normalMax: 200,
    criticalHigh: 240,
    referenceRangeText: '< 200 mg/dL',
  },
  'ldl cholesterol': {
    standardName: 'LDL Cholesterol',
    unit: 'mg/dL',
    normalMin: 50,
    normalMax: 100,
    criticalHigh: 160,
    referenceRangeText: '< 100 mg/dL',
  },
  'hdl cholesterol': {
    standardName: 'HDL Cholesterol',
    unit: 'mg/dL',
    normalMin: 50,
    normalMax: 90,
    referenceRangeText: '> 50 mg/dL',
  },
  'triglycerides': {
    standardName: 'Triglycerides',
    unit: 'mg/dL',
    normalMin: 50,
    normalMax: 150,
    criticalHigh: 200,
    referenceRangeText: '< 150 mg/dL',
  },
  'fasting blood glucose': {
    standardName: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    normalMin: 70,
    normalMax: 99,
    criticalHigh: 126,
    referenceRangeText: '70 - 99 mg/dL',
  },
  'hba1c': {
    standardName: 'Hemoglobin A1c (HbA1c)',
    unit: '%',
    normalMin: 4.0,
    normalMax: 5.6,
    criticalHigh: 6.5,
    referenceRangeText: '< 5.7 %',
  },
  'systolic blood pressure': {
    standardName: 'Systolic Blood Pressure',
    unit: 'mmHg',
    normalMin: 90,
    normalMax: 120,
    criticalHigh: 140,
    referenceRangeText: '90 - 120 mmHg',
  },
  'diastolic blood pressure': {
    standardName: 'Diastolic Blood Pressure',
    unit: 'mmHg',
    normalMin: 60,
    normalMax: 80,
    criticalHigh: 90,
    referenceRangeText: '60 - 80 mmHg',
  },
  'egfr': {
    standardName: 'eGFR (Renal Function)',
    unit: 'mL/min/1.73m²',
    normalMin: 60,
    normalMax: 120,
    referenceRangeText: '> 60 mL/min',
  },
  'resting heart rate': {
    standardName: 'Resting Heart Rate',
    unit: 'bpm',
    normalMin: 60,
    normalMax: 100,
    referenceRangeText: '60 - 100 bpm',
  },
};

export class ReportComparisonService {
  /**
   * Parse numerical value from string (e.g. "205 mg/dL" -> 205)
   */
  static extractNumber(str: string): number | null {
    if (!str) return null;
    const match = str.match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * Determine biomarker status against clinical normal ranges
   */
  static determineStatus(value: number, key: string): BiomarkerStatus {
    const config = CLINICAL_BIOMARKER_STANDARDS[key.toLowerCase()];
    if (!config) return 'NORMAL';

    if (config.criticalHigh && value >= config.criticalHigh) return 'CRITICAL';
    if (value > config.normalMax) return 'HIGH';
    if (value < config.normalMin) return 'LOW';
    return 'NORMAL';
  }

  /**
   * Compare all diagnostic reports for a given patient and calculate biomarker trends
   */
  static async getPatientReportComparison(
    patientEmail: string,
    patientUid: string,
    displayName?: string
  ): Promise<{
    reports: MedicalRecordReport[];
    biomarkers: ReportBiomarkerComparison[];
    summary: {
      totalReports: number;
      trackedBiomarkersCount: number;
      highBiomarkersCount: number;
      criticalBiomarkersCount: number;
      overallStatus: 'STABLE' | 'NEEDS_ATTENTION' | 'CRITICAL';
    };
  }> {
    const dashboardData = await PatientService.getPatientDashboardData(patientEmail, patientUid, displayName);
    const reports = [...(dashboardData.medicalRecords.reports || [])];

    // If only 1 report exists for demo patient Eleanor, synthesize prior baseline report to enable real comparison
    if (reports.length === 1 && (patientEmail.includes('eleanor') || patientUid.includes('eleanor'))) {
      const priorReport: MedicalRecordReport = {
        id: 'rep-eleanor-baseline-2025',
        patientId: patientUid,
        title: 'Comprehensive Annual Metabolic Screening',
        category: 'LAB_REPORT',
        date: '2025-11-10',
        doctorName: 'Dr. Sarah Jenkins',
        summary: 'Baseline annual screening. Cholesterol borderline elevated; glucose optimal.',
        status: 'NORMAL',
        metrics: [
          { name: 'Total Cholesterol', value: '194 mg/dL', referenceRange: '< 200 mg/dL', status: 'NORMAL' },
          { name: 'HDL Cholesterol', value: '60 mg/dL', referenceRange: '> 50 mg/dL', status: 'NORMAL' },
          { name: 'LDL Cholesterol', value: '110 mg/dL', referenceRange: '< 100 mg/dL', status: 'HIGH' },
          { name: 'Fasting Blood Glucose', value: '88 mg/dL', referenceRange: '70 - 99 mg/dL', status: 'NORMAL' },
          { name: 'eGFR (Renal)', value: '92 mL/min/1.73m²', referenceRange: '> 60 mL/min', status: 'NORMAL' },
        ],
      };
      reports.push(priorReport);
    }

    // Sort reports chronologically ascending (oldest first)
    reports.sort((a, b) => a.date.localeCompare(b.date));

    // Map each standard biomarker to its historical values across reports
    const biomarkerMap = new Map<string, ReportBiomarkerComparison>();

    for (const report of reports) {
      for (const metric of (report.metrics || [])) {
        const lowerName = metric.name.trim().toLowerCase();
        // Check if matches known standard
        let matchedKey = Object.keys(CLINICAL_BIOMARKER_STANDARDS).find(
          (k) => lowerName.includes(k) || k.includes(lowerName)
        );

        const standard = matchedKey ? CLINICAL_BIOMARKER_STANDARDS[matchedKey] : null;
        const displayName = standard ? standard.standardName : metric.name;
        const unit = standard ? standard.unit : '';
        const referenceRange = standard ? standard.referenceRangeText : metric.referenceRange;

        const val = this.extractNumber(metric.value);
        if (val === null) continue;

        const status = standard ? this.determineStatus(val, matchedKey!) : (metric.status as BiomarkerStatus);

        if (!biomarkerMap.has(displayName)) {
          biomarkerMap.set(displayName, {
            biomarkerName: displayName,
            unit,
            referenceRange,
            historicalReadings: [],
            latestValue: val,
            latestStatus: status,
            trend: 'STABLE',
            interpretation: 'Initial recorded baseline value.',
          });
        }

        const comp = biomarkerMap.get(displayName)!;
        comp.historicalReadings.push({
          date: report.date,
          reportId: report.id,
          reportTitle: report.title,
          value: val,
          status,
        });
      }
    }

    // Compute trends and interpretations for each biomarker
    let highCount = 0;
    let criticalCount = 0;

    const biomarkerComparisons: ReportBiomarkerComparison[] = [];

    biomarkerMap.forEach((comp) => {
      // Sort readings chronologically
      comp.historicalReadings.sort((a, b) => a.date.localeCompare(b.date));

      const len = comp.historicalReadings.length;
      if (len > 0) {
        const latest = comp.historicalReadings[len - 1];
        comp.latestValue = latest.value;
        comp.latestStatus = latest.status;

        if (latest.status === 'HIGH') highCount++;
        if (latest.status === 'CRITICAL') criticalCount++;

        if (len >= 2) {
          const prev = comp.historicalReadings[len - 2];
          comp.previousValue = prev.value;
          const diff = comp.latestValue - prev.value;
          const diffPct = ((diff / prev.value) * 100).toFixed(1);

          if (Math.abs(diff) < 0.5) {
            comp.trend = 'STABLE';
            comp.interpretation = `Stable compared to ${prev.date} reading (${prev.value} ${comp.unit}).`;
          } else if (diff > 0) {
            comp.trend = 'INCREASED';
            comp.interpretation = `Increased by +${diff.toFixed(1)} ${comp.unit} (+${diffPct}%) since ${prev.date}. ${comp.latestStatus === 'HIGH' ? 'Currently elevated above target range.' : 'Remains within normal threshold.'}`;
          } else {
            comp.trend = 'DECREASED';
            comp.interpretation = `Decreased by ${diff.toFixed(1)} ${comp.unit} (${diffPct}%) since ${prev.date}. ${comp.latestStatus === 'NORMAL' ? 'Improved towards clinical baseline.' : 'Monitor with primary care.'}`;
          }
        } else {
          comp.trend = 'STABLE';
          comp.interpretation = `Single clinical baseline on record (${latest.date}). Normal target: ${comp.referenceRange}.`;
        }
      }

      biomarkerComparisons.push(comp);
    });

    const overallStatus: 'STABLE' | 'NEEDS_ATTENTION' | 'CRITICAL' =
      criticalCount > 0 ? 'CRITICAL' : highCount > 0 ? 'NEEDS_ATTENTION' : 'STABLE';

    return {
      reports,
      biomarkers: biomarkerComparisons,
      summary: {
        totalReports: reports.length,
        trackedBiomarkersCount: biomarkerComparisons.length,
        highBiomarkersCount: highCount,
        criticalBiomarkersCount: criticalCount,
        overallStatus,
      },
    };
  }

  /**
   * Upload and process a new diagnostic report
   */
  static async uploadReport(params: {
    patientEmail: string;
    patientId: string;
    title: string;
    category?: MedicalRecordReport['category'];
    date?: string;
    doctorName?: string;
    summary: string;
    metrics: { name: string; value: string; referenceRange?: string }[];
  }): Promise<MedicalRecordReport> {
    const reportDate = params.date || new Date().toISOString().split('T')[0];

    const processedMetrics = params.metrics.map((m) => {
      const num = this.extractNumber(m.value);
      const matchedKey = Object.keys(CLINICAL_BIOMARKER_STANDARDS).find(
        (k) => m.name.toLowerCase().includes(k) || k.includes(m.name.toLowerCase())
      );
      const standard = matchedKey ? CLINICAL_BIOMARKER_STANDARDS[matchedKey] : null;

      let status: BiomarkerStatus = 'NORMAL';
      if (num !== null && matchedKey) {
        status = this.determineStatus(num, matchedKey);
      }

      return {
        name: m.name,
        value: m.value,
        referenceRange: standard?.referenceRangeText || m.referenceRange || 'Standard',
        status,
      };
    });

    const hasCritical = processedMetrics.some((m) => m.status === 'CRITICAL');
    const hasHigh = processedMetrics.some((m) => m.status === 'HIGH');
    const overallStatus: MedicalRecordReport['status'] = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'NORMAL';

    const newReport: MedicalRecordReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      patientId: params.patientId,
      title: params.title,
      category: params.category || 'LAB_REPORT',
      date: reportDate,
      doctorName: params.doctorName || 'Dr. Sarah Jenkins',
      summary: params.summary || 'Diagnostic laboratory analysis uploaded to patient electronic medical record.',
      status: overallStatus,
      metrics: processedMetrics,
    };

    // Save report in PatientService
    await PatientService.addMedicalReport(params.patientEmail, params.patientId, newReport);

    return newReport;
  }
}
