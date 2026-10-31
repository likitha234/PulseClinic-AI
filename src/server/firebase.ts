/**
 * PulseClinic AI - Cloud Firestore Backend Integration
 * Authenticates with Firebase Admin SDK using secure server-side credentials
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp: App | null = null;
let firestoreDb: Firestore | null = null;

function parsePrivateKey(rawKey?: string): string {
  if (!rawKey) return '';
  let pk = rawKey.trim();
  // Strip trailing comma if copied from JSON
  if (pk.endsWith(',')) pk = pk.slice(0, -1).trim();
  // Strip surrounding quotes
  if ((pk.startsWith('"') && pk.endsWith('"')) || (pk.startsWith("'") && pk.endsWith("'"))) {
    pk = pk.slice(1, -1);
  }
  // Replace escaped \n with real newlines
  pk = pk.replace(/\\n/g, '\n').trim();
  return pk;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export function getFirestoreDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Firebase Admin credentials missing from environment.');
    return null;
  }

  try {
    if (getApps().length === 0) {
      const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log(`[Firebase] Initialized Firebase Admin for project: ${process.env.FIREBASE_PROJECT_ID}`);
    } else {
      firebaseApp = getApps()[0];
    }

    firestoreDb = getFirestore(firebaseApp);
    return firestoreDb;
  } catch (err: any) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', err.message);
    return null;
  }
}

export async function verifyFirestoreConnection(): Promise<{
  connected: boolean;
  projectId: string;
  error?: string;
}> {
  const db = getFirestoreDb();
  if (!db) {
    return {
      connected: false,
      projectId: process.env.FIREBASE_PROJECT_ID || 'unconfigured',
      error: 'Firebase credentials not configured or initialization failed',
    };
  }

  try {
    // Perform a lightweight probe query
    await db.collection('patients').limit(1).get();
    return {
      connected: true,
      projectId: process.env.FIREBASE_PROJECT_ID || 'pulseclinic-ai',
    };
  } catch (err: any) {
    console.error('[Firebase] Firestore health probe failed:', err.message);
    return {
      connected: false,
      projectId: process.env.FIREBASE_PROJECT_ID || 'unknown',
      error: err.message,
    };
  }
}

export async function getLiveFirestoreCollectionStats(): Promise<{
  connected: boolean;
  projectId: string;
  collections: {
    patients: { count: number; sampleIds: string[] };
    medical_history: { count: number; sampleIds: string[] };
    doctors: { count: number; sampleIds: string[] };
    doctor_availability: { count: number; sampleIds: string[] };
    appointments: { count: number; sampleIds: string[] };
    triage_test_data: { count: number; sampleIds: string[] };
    evaluation_test_cases: { count: number; sampleIds: string[] };
  };
}> {
  const defaultStats = {
    connected: false,
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    collections: {
      patients: { count: 0, sampleIds: [] as string[] },
      medical_history: { count: 0, sampleIds: [] as string[] },
      doctors: { count: 0, sampleIds: [] as string[] },
      doctor_availability: { count: 0, sampleIds: [] as string[] },
      appointments: { count: 0, sampleIds: [] as string[] },
      triage_test_data: { count: 0, sampleIds: [] as string[] },
      evaluation_test_cases: { count: 0, sampleIds: [] as string[] },
    },
  };

  const db = getFirestoreDb();
  if (!db) return defaultStats;

  try {
    const collNames = [
      'patients',
      'medical_history',
      'doctors',
      'doctor_availability',
      'appointments',
      'triage_test_data',
      'evaluation_test_cases',
    ] as const;

    const statsObj = { ...defaultStats, connected: true };

    await Promise.all(
      collNames.map(async (name) => {
        try {
          const snap = await db.collection(name).limit(50).get();
          statsObj.collections[name] = {
            count: snap.size,
            sampleIds: snap.docs.slice(0, 5).map((d) => d.id),
          };
        } catch (e: any) {
          console.warn(`[Firebase] Could not query collection ${name}:`, e.message);
        }
      })
    );

    return statsObj;
  } catch (err) {
    console.error('[Firebase] Error getting collection stats:', err);
    return defaultStats;
  }
}
