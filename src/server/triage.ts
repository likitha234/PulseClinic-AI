/**
 * PulseClinic AI - Clinical Triage Protocol & Safety Guardrails
 * Deterministic rule-based validation engine for emergency detection, prescription refusal, and specialist routing
 */

import {
  TriageAssessment,
  TriageUrgency,
  RedFlagDetection,
  DoctorSpecialty,
  Patient,
} from '../types/index.ts';

export const MANDATORY_PRESCRIPTION_REFUSAL =
  'I cannot prescribe medication or recommend prescription dosages. A qualified healthcare professional must assess your condition. I can help arrange a consultation.';

// Red Flag Keyword & Pattern Rules
const RED_FLAG_RULES: {
  category: RedFlagDetection['category'];
  keywords: string[];
  rationale: string;
}[] = [
  {
    category: 'breathing',
    keywords: [
      'cannot breathe',
      "can't breathe",
      'struggling to breathe',
      'severe breathing difficulty',
      'shortness of breath at rest',
      'gasping for air',
      'turning blue',
      'cyanosis',
      'suffocating',
      'severe asthma attack',
    ],
    rationale: 'Severe acute respiratory distress detected. High risk of airway compromise or hypoxia.',
  },
  {
    category: 'chest_pain',
    keywords: [
      'severe chest pain',
      'crushing chest pain',
      'pressure on chest like an elephant',
      'chest pain radiating to arm',
      'chest pain radiating to jaw',
      'heart attack',
      'crushing sternal pressure',
      'chest pain with cold sweat',
    ],
    rationale: 'Acute coronary syndrome or myocardial infarction red flag detected.',
  },
  {
    category: 'stroke',
    keywords: [
      'stroke',
      'face drooping',
      'facial droop',
      'arm weakness',
      'slurred speech',
      'cannot speak',
      'sudden numbness one side',
      'unilateral weakness',
      'loss of vision one eye',
    ],
    rationale: 'Suspected acute ischemic or hemorrhagic stroke (FAST criteria positive). Time-critical emergency.',
  },
  {
    category: 'unconsciousness',
    keywords: [
      'unconscious',
      'passed out',
      'blacked out',
      'unresponsive',
      'fainted and cannot wake',
      'altered mental state',
      'coma',
    ],
    rationale: 'Loss of consciousness / severe altered level of consciousness detected.',
  },
  {
    category: 'severe_bleeding',
    keywords: [
      'severe uncontrolled bleeding',
      'gushing blood',
      'arterial bleeding',
      'blood won’t stop',
      'blood will not stop',
      'massive blood loss',
      'coughing up large amounts of blood',
      'vomiting bright red blood',
    ],
    rationale: 'Severe uncontrolled hemorrhage detected. Immediate trauma/hemostasis required.',
  },
  {
    category: 'anaphylaxis',
    keywords: [
      'anaphylaxis',
      'throat closing up',
      'swollen tongue and throat',
      'severe allergic reaction cannot breathe',
      'epipen needed',
    ],
    rationale: 'Severe systemic anaphylactic reaction with impending airway occlusion.',
  },
];

// Medication request detection patterns
const PRESCRIPTION_PATTERNS = [
  /prescribe/i,
  /prescription/i,
  /antibiotic/i,
  /amoxicillin/i,
  /cipro/i,
  /azithromycin/i,
  /painkiller/i,
  /xanax/i,
  /adderall/i,
  /dosage/i,
  /dose instruction/i,
  /what mg/i,
  /give me medicine/i,
  /order pills/i,
  /refill my rx/i,
];

// Evaluates whether input contains prescription requests
export function checkPrescriptionRequest(text: string): { isRequest: boolean; response?: string } {
  const matches = PRESCRIPTION_PATTERNS.some((pattern) => pattern.test(text));
  if (matches) {
    return {
      isRequest: true,
      response: MANDATORY_PRESCRIPTION_REFUSAL,
    };
  }
  return { isRequest: false };
}

// Deterministic Red Flag Analysis
export function evaluateRedFlags(text: string, symptoms: string[]): RedFlagDetection {
  const combinedText = `${text} ${symptoms.join(' ')}`.toLowerCase();

  for (const rule of RED_FLAG_RULES) {
    const matched = rule.keywords.filter((kw) => combinedText.includes(kw));
    if (matched.length > 0) {
      return {
        triggered: true,
        category: rule.category,
        detectedSymptoms: matched,
        rationale: rule.rationale,
      };
    }
  }

  return {
    triggered: false,
    category: 'none',
    detectedSymptoms: [],
    rationale: 'No acute emergency red flags identified according to clinical triage protocol.',
  };
}

// Urgent Clinical Assessment rules (ORANGE)
const URGENT_KEYWORDS = [
  'high fever',
  'fever over 103',
  'fever over 39',
  'severe abdominal pain',
  'acute pain 8/10',
  'acute pain 9/10',
  'acute pain 10/10',
  'possible fracture',
  'unable to bear weight',
  'persistent vomiting dehydration',
  'severe infection',
  'acute burn',
];

export function evaluateUrgentSymptoms(text: string, symptoms: string[], severity: number): boolean {
  if (severity >= 8) return true;
  const combined = `${text} ${symptoms.join(' ')}`.toLowerCase();
  return URGENT_KEYWORDS.some((kw) => combined.includes(kw));
}

// Specialist Matching Protocol
export function matchSpecialist(
  complaint: string,
  symptoms: string[],
  patientAge?: number
): { specialty: DoctorSpecialty; rationale: string } {
  // If patient is a child under 18, prioritize Pediatrician
  if (patientAge !== undefined && patientAge < 18) {
    return {
      specialty: 'Pediatrician',
      rationale: `Patient is under 18 years old (${patientAge} years). Routed to specialized Pediatric care.`,
    };
  }

  const text = `${complaint} ${symptoms.join(' ')}`.toLowerCase();

  // Cardiology
  if (
    /heart|cardio|chest tightness|palpitations|irregular heartbeat|high blood pressure|hypertension|angina|pulse racing/i.test(
      text
    )
  ) {
    return {
      specialty: 'Cardiologist',
      rationale: 'Symptoms related to cardiovascular system, heart rhythm, or blood pressure regulation.',
    };
  }

  // Dermatology
  if (
    /skin|rash|eczema|psoriasis|acne|mole|itchy|dermatitis|hives|lesion|blister|scaling/i.test(text)
  ) {
    return {
      specialty: 'Dermatologist',
      rationale: 'Symptoms localized to integumentary/dermatological system requiring visual specialist assessment.',
    };
  }

  // Orthopedic
  if (
    /bone|joint|knee|shoulder|back pain|spine|fracture|sprain|ligament|tendon|ankle|hip|arthritis|musculoskeletal|swollen joint/i.test(
      text
    )
  ) {
    return {
      specialty: 'Orthopedic',
      rationale: 'Musculoskeletal or orthopedic complaint requiring joint, bone, or structural evaluation.',
    };
  }

  // Neurologist
  if (
    /headache|migraine|numbness|tingling|vertigo|dizziness|nerve|tremor|seizure|memory loss|sciatica|neuropathy/i.test(
      text
    )
  ) {
    return {
      specialty: 'Neurologist',
      rationale: 'Neurological symptoms affecting cranial, central, or peripheral nervous system.',
    };
  }

  // Default to General Physician
  return {
    specialty: 'General Physician',
    rationale: 'Primary care presentation suitable for comprehensive internal medicine evaluation.',
  };
}

// Complete Deterministic Triage Run
export function performClinicalTriage(params: {
  patientId: string;
  complaint: string;
  symptoms: string[];
  duration: string;
  severity: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  onset: string;
  associatedSymptoms: string[];
  patient?: Patient;
}): TriageAssessment {
  const redFlagAnalysis = evaluateRedFlags(
    `${params.complaint} ${params.symptoms.join(' ')}`,
    params.associatedSymptoms
  );

  let urgency: TriageUrgency = 'GREEN';
  let actionRequired: TriageAssessment['actionRequired'] = 'ROUTINE_SPECIALIST_BOOKING';
  let clinicalRationale = 'Condition exhibits non-critical stability suitable for routine outpatient scheduling.';

  if (redFlagAnalysis.triggered) {
    urgency = 'RED';
    actionRequired = 'EMERGENCY_ESCALATION';
    clinicalRationale = `CRITICAL EMERGENCY DETECTED: ${redFlagAnalysis.rationale} Immediate triage halt and emergency medical escalation mandatory.`;
  } else if (
    evaluateUrgentSymptoms(
      `${params.complaint} ${params.symptoms.join(' ')}`,
      params.associatedSymptoms,
      params.severity
    )
  ) {
    urgency = 'ORANGE';
    actionRequired = 'URGENT_CLINICAL_REVIEW';
    clinicalRationale = `High severity score (${params.severity}/10) or acute symptom profile requires prioritized clinical staff review and fast-track booking.`;
  }

  const { specialty, rationale: specRationale } = matchSpecialist(
    params.complaint,
    [...params.symptoms, ...params.associatedSymptoms],
    params.patient?.age
  );

  return {
    id: `triage-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    patientId: params.patientId,
    timestamp: new Date().toISOString(),
    urgency,
    primaryComplaint: params.complaint,
    symptoms: params.symptoms,
    duration: params.duration,
    severity: params.severity,
    onset: params.onset,
    associatedSymptoms: params.associatedSymptoms,
    redFlagAnalysis,
    recommendedSpecialty: specialty,
    clinicalRationale: `${clinicalRationale} Specialist Routing: ${specRationale}`,
    actionRequired,
    escalatedToStaff: urgency === 'RED' || urgency === 'ORANGE',
  };
}
