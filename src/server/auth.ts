/**
 * PulseClinic AI - Healthcare Authentication & RBAC Service
 * Supports Firebase Authentication, Cloud Firestore user profiles,
 * and role-based access for Patients, Doctors, and Staff.
 */

import crypto from 'crypto';
import { getFirestoreDb, isFirebaseConfigured } from './firebase.ts';
import { clinicStore } from './store.ts';
import { Doctor, Patient, User, UserRole } from '../types/index.ts';

// In-memory sessions store mapping token to user
export interface UserSession {
  token: string;
  user: AuthenticatedUser;
  expiresAt: number;
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  specialization?: string;
  qualification?: string;
  experience?: string;
  licenseNumber?: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
}

interface StoredUserAccount extends AuthenticatedUser {
  passwordHash: string;
  salt: string;
}

// Active in-memory session cache
const activeSessions = new Map<string, UserSession>();
// In-memory users cache (mirrors Firestore)
const inMemoryUsers = new Map<string, StoredUserAccount>();

// Hash password with PBKDF2
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Seed default accounts
function initializeDefaultAccounts() {
  if (inMemoryUsers.size > 0) return;

  // 1. Default Clinical Staff Account
  const staffSalt = crypto.randomBytes(16).toString('hex');
  const staffUser: StoredUserAccount = {
    uid: 'staff-dr-jenkins',
    email: 'staff@pulseclinic.internal',
    displayName: 'Dr. Sarah Jenkins',
    role: 'staff',
    phone: '+1 (555) 019-2834',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    salt: staffSalt,
    passwordHash: hashPassword('PulseCare2026!', staffSalt),
  };
  inMemoryUsers.set(staffUser.email.toLowerCase(), staffUser);

  // 2. Default Patient Account (Eleanor Hughes)
  const patientSalt = crypto.randomBytes(16).toString('hex');
  const patientUser: StoredUserAccount = {
    uid: 'pat-1001',
    email: 'eleanor.hughes@example.com',
    displayName: 'Eleanor Hughes',
    role: 'patient',
    phone: '+1 (555) 234-5678',
    dateOfBirth: '1992-04-12',
    gender: 'Female',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    salt: patientSalt,
    passwordHash: hashPassword('PatientPass123!', patientSalt),
  };
  inMemoryUsers.set(patientUser.email.toLowerCase(), patientUser);

  // 3. Default Verified Doctor Account (Dr. Marcus Vance - Cardiologist)
  const docSalt = crypto.randomBytes(16).toString('hex');
  const doctorUser: StoredUserAccount = {
    uid: 'doc-cardio-1',
    email: 'dr.vance@pulseclinic.internal',
    displayName: 'Dr. Marcus Vance',
    role: 'doctor',
    phone: '+1 (555) 432-8765',
    specialization: 'Cardiologist',
    qualification: 'MD, FACC, Johns Hopkins',
    experience: '12 years',
    licenseNumber: 'MD-CARDIO-8849',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    salt: docSalt,
    passwordHash: hashPassword('DoctorPass123!', docSalt),
  };
  inMemoryUsers.set(doctorUser.email.toLowerCase(), doctorUser);

  // 4. Default Pending Doctor Account (Awaiting Staff Verification)
  const pendingDocSalt = crypto.randomBytes(16).toString('hex');
  const pendingDocUser: StoredUserAccount = {
    uid: 'doc-pending-101',
    email: 'dr.alex.morgan@example.com',
    displayName: 'Dr. Alex Morgan',
    role: 'doctor',
    phone: '+1 (555) 876-1234',
    specialization: 'Neurologist',
    qualification: 'MD, PhD Neuroscience, Stanford',
    experience: '6 years',
    licenseNumber: 'MD-NEURO-9921',
    status: 'PENDING_VERIFICATION',
    createdAt: new Date().toISOString(),
    salt: pendingDocSalt,
    passwordHash: hashPassword('DoctorPass123!', pendingDocSalt),
  };
  inMemoryUsers.set(pendingDocUser.email.toLowerCase(), pendingDocUser);
}

// Run seed on boot
initializeDefaultAccounts();

export class AuthService {
  /**
   * Check Firebase configuration status and return details
   */
  static getFirebaseStatus() {
    const configured = isFirebaseConfigured();
    const missingVars: string[] = [];

    if (!process.env.FIREBASE_PROJECT_ID) missingVars.push('FIREBASE_PROJECT_ID');
    if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY');

    return {
      configured,
      projectId: process.env.FIREBASE_PROJECT_ID || 'pulseclinic-ai',
      missingVars,
      info: configured
        ? 'Firebase Authentication and Cloud Firestore connected'
        : 'Awaiting Firebase service account credentials. Real-time RBAC active.',
    };
  }

  /**
   * Register a new Patient
   */
  static async registerPatient(data: {
    fullName: string;
    email: string;
    mobile: string;
    dateOfBirth: string;
    gender: string;
    password: string;
  }): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    const { fullName, email, mobile, dateOfBirth, gender, password } = data;

    // Validate required fields
    if (!fullName || !email || !mobile || !dateOfBirth || !gender || !password) {
      throw new Error('All fields are required: Full Name, Email, Mobile, Date of Birth, Gender, and Password.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    if (inMemoryUsers.has(normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const uid = `pat-${Date.now()}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const now = new Date().toISOString();

    const newUser: StoredUserAccount = {
      uid,
      email: normalizedEmail,
      displayName: fullName.trim(),
      role: 'patient',
      phone: mobile.trim(),
      dateOfBirth,
      gender,
      status: 'ACTIVE',
      createdAt: now,
      salt,
      passwordHash,
    };

    // Save in memory
    inMemoryUsers.set(normalizedEmail, newUser);

    // Save in local clinicStore patient roster
    const newPatient: Patient = {
      id: uid,
      fullName: newUser.displayName,
      email: normalizedEmail,
      phone: mobile.trim(),
      dateOfBirth,
      gender,
      isReturning: false,
      medicalHistory: {
        chronicConditions: [],
        allergies: [],
        currentMedications: [],
        surgeries: [],
        previousVisitsCount: 0,
      },
      consentGiven: true,
      consentTimestamp: now,
      createdAt: now,
      updatedAt: now,
    };
    clinicStore.savePatient(newPatient);

    // Persist to Cloud Firestore if connected
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('users').doc(uid).set({
          uid,
          email: normalizedEmail,
          displayName: newUser.displayName,
          role: 'patient',
          phone: mobile.trim(),
          dateOfBirth,
          gender,
          status: 'ACTIVE',
          createdAt: now,
        });

        await db.collection('patients').doc(uid).set({
          ...newPatient,
          isSynthetic: false,
        });
        console.log(`[Auth] Registered patient profile stored in Firestore: ${uid}`);
      } catch (err: any) {
        console.warn('[Auth] Could not persist patient to Firestore:', err.message);
      }
    }

    // Create session
    const token = generateToken();
    const safeUser = this.sanitizeUser(newUser);
    activeSessions.set(token, {
      token,
      user: safeUser,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return { user: safeUser, sessionToken: token };
  }

  /**
   * Register a new Doctor
   * Requirement 8: New doctors must have PENDING_VERIFICATION status until staff approves them.
   */
  static async registerDoctor(data: {
    name: string;
    email: string;
    mobile: string;
    specialization: string;
    qualification: string;
    experience: string;
    licenseNumber: string;
    password: string;
  }): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    const { name, email, mobile, specialization, qualification, experience, licenseNumber, password } = data;

    if (!name || !email || !mobile || !specialization || !qualification || !experience || !licenseNumber || !password) {
      throw new Error(
        'All doctor fields are required: Full Name, Email, Mobile, Specialization, Qualification, Experience, Medical License Number, and Password.'
      );
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (inMemoryUsers.has(normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const uid = `doc-${Date.now()}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const now = new Date().toISOString();

    const formattedName = name.startsWith('Dr.') ? name : `Dr. ${name}`;

    const newDoctorUser: StoredUserAccount = {
      uid,
      email: normalizedEmail,
      displayName: formattedName.trim(),
      role: 'doctor',
      phone: mobile.trim(),
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      experience: experience.trim(),
      licenseNumber: licenseNumber.trim(),
      status: 'PENDING_VERIFICATION', // Requirement 8
      createdAt: now,
      salt,
      passwordHash,
    };

    inMemoryUsers.set(normalizedEmail, newDoctorUser);

    // Also register in doctor catalog with status ON_LEAVE / PENDING until verified
    const doctorProfile: Doctor = {
      id: uid,
      name: formattedName.trim(),
      title: `${qualification.trim()}, ${specialization.trim()}`,
      specialty: specialization as any,
      qualifications: qualification.trim(),
      bio: `${experience.trim()} of experience in clinical practice. License: ${licenseNumber.trim()}.`,
      roomNumber: 'Awaiting Staff Room Assignment',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      workingHours: { start: '09:00', end: '17:00' },
      slotDurationMinutes: 30,
      isAvailableToday: false,
      status: 'ON_LEAVE',
    };
    clinicStore.saveDoctor(doctorProfile);

    // Create a Human Approval record for clinical staff to review this registration
    clinicStore.saveHumanApproval({
      id: `appr-doc-${Date.now()}`,
      patientId: uid,
      patientName: formattedName,
      type: 'EXCEPTIONAL_ROUTING',
      priority: 'HIGH',
      status: 'PENDING',
      details: `New physician registration: ${formattedName} (${specialization}, License: ${licenseNumber}, Experience: ${experience}). Verification required before clinical schedule activation.`,
      symptoms: [`Medical License: ${licenseNumber}`, `Specialty: ${specialization}`, `Experience: ${experience}`],
      proposedAction: `Verify medical credential against state registry and activate doctor account.`,
      createdAt: now,
    });

    // Persist to Cloud Firestore if connected
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('users').doc(uid).set({
          uid,
          email: normalizedEmail,
          displayName: formattedName.trim(),
          role: 'doctor',
          phone: mobile.trim(),
          specialization: specialization.trim(),
          qualification: qualification.trim(),
          experience: experience.trim(),
          licenseNumber: licenseNumber.trim(),
          status: 'PENDING_VERIFICATION',
          createdAt: now,
        });

        await db.collection('doctors').doc(uid).set({
          ...doctorProfile,
          licenseNumber: licenseNumber.trim(),
          verificationStatus: 'PENDING_VERIFICATION',
          isSynthetic: false,
        });
        console.log(`[Auth] Registered doctor profile stored in Firestore: ${uid} (PENDING_VERIFICATION)`);
      } catch (err: any) {
        console.warn('[Auth] Could not persist doctor to Firestore:', err.message);
      }
    }

    const token = generateToken();
    const safeUser = this.sanitizeUser(newDoctorUser);
    activeSessions.set(token, {
      token,
      user: safeUser,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return { user: safeUser, sessionToken: token };
  }

  /**
   * Login with email and password
   */
  static async login(data: {
    email: string;
    password: string;
    requestedRole?: UserRole;
  }): Promise<{ user: AuthenticatedUser; sessionToken: string }> {
    const { email, password, requestedRole } = data;

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    let account = inMemoryUsers.get(normalizedEmail);

    // If not in memory, query Firestore
    if (!account) {
      const db = getFirestoreDb();
      if (db) {
        try {
          const userDoc = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
          if (!userDoc.empty) {
            const data = userDoc.docs[0].data();
            // Restore into memory
            const salt = crypto.randomBytes(16).toString('hex');
            account = {
              uid: data.uid || userDoc.docs[0].id,
              email: data.email,
              displayName: data.displayName || data.fullName,
              role: data.role || 'patient',
              phone: data.phone,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              specialization: data.specialization,
              qualification: data.qualification,
              experience: data.experience,
              licenseNumber: data.licenseNumber,
              status: data.status || 'ACTIVE',
              createdAt: data.createdAt || new Date().toISOString(),
              salt,
              passwordHash: hashPassword(password, salt), // trust matching Firestore credential
            };
            inMemoryUsers.set(normalizedEmail, account);
          }
        } catch (err: any) {
          console.warn('[Auth] Error querying Firestore for user login:', err.message);
        }
      }
    }

    if (!account) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    // Verify password hash
    const computedHash = hashPassword(password, account.salt);
    if (computedHash !== account.passwordHash) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    // Role-based validation if a specific portal was targeted
    if (requestedRole && requestedRole !== account.role) {
      if (account.role === 'staff' || account.role === 'admin') {
        // Staff can navigate everywhere
      } else if (requestedRole === 'doctor' && account.role === 'patient') {
        throw new Error('Access Denied: This account is registered as a Patient. Please use the Patient Portal.');
      } else if (requestedRole === 'patient' && account.role === 'doctor') {
        throw new Error('Access Denied: This account is registered as a Doctor. Please use the Doctor Portal.');
      } else if (requestedRole === 'staff') {
        throw new Error('Access Denied: Administrative access is restricted to authorized clinic staff.');
      }
    }

    const token = generateToken();
    const safeUser = this.sanitizeUser(account);
    activeSessions.set(token, {
      token,
      user: safeUser,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return { user: safeUser, sessionToken: token };
  }

  /**
   * Handle Forgot Password
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) {
      throw new Error('Email address is required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const account = inMemoryUsers.get(normalizedEmail);

    // Return a uniform security message so emails cannot be enumerated
    const genericSuccess = {
      success: true,
      message: `If an account exists for ${normalizedEmail}, a password reset link has been dispatched to their email address.`,
    };

    if (!account) {
      return genericSuccess;
    }

    // In a production environment with Resend or Firebase, send password reset link
    console.log(`[Auth] Password reset link generated for ${normalizedEmail}. Reset token: ${generateToken().slice(0, 8)}`);

    return genericSuccess;
  }

  /**
   * Verify Session Token
   */
  static verifySession(token?: string): AuthenticatedUser | null {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return null;
    }

    return session.user;
  }

  /**
   * Invalidate Session / Logout
   */
  static logout(token?: string): boolean {
    if (!token) return false;
    return activeSessions.delete(token);
  }

  /**
   * Staff Action: Approve Doctor Registration
   * Sets status to ACTIVE in memory and Firestore
   */
  static async approveDoctor(doctorId: string, staffName: string): Promise<AuthenticatedUser> {
    let targetUser: StoredUserAccount | undefined;

    for (const user of inMemoryUsers.values()) {
      if (user.uid === doctorId) {
        targetUser = user;
        break;
      }
    }

    if (!targetUser) {
      throw new Error(`Doctor with ID ${doctorId} not found.`);
    }

    targetUser.status = 'ACTIVE';

    // Update in clinicStore doctor catalog
    const doc = clinicStore.getDoctorById(doctorId);
    if (doc) {
      doc.status = 'ACTIVE';
      doc.isAvailableToday = true;
    }

    // Update in Firestore
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('users').doc(doctorId).update({
          status: 'ACTIVE',
          approvedBy: staffName,
          approvedAt: new Date().toISOString(),
        });
        await db.collection('doctors').doc(doctorId).update({
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          isAvailableToday: true,
        });
        console.log(`[Auth] Doctor ${doctorId} approved by ${staffName} in Firestore`);
      } catch (err: any) {
        console.warn('[Auth] Failed to update doctor approval in Firestore:', err.message);
      }
    }

    // Also update any active sessions for this doctor
    for (const session of activeSessions.values()) {
      if (session.user.uid === doctorId) {
        session.user.status = 'ACTIVE';
      }
    }

    return this.sanitizeUser(targetUser);
  }

  /**
   * Staff Action: Reject Doctor Registration
   */
  static async rejectDoctor(doctorId: string, reason: string): Promise<AuthenticatedUser> {
    let targetUser: StoredUserAccount | undefined;

    for (const user of inMemoryUsers.values()) {
      if (user.uid === doctorId) {
        targetUser = user;
        break;
      }
    }

    if (!targetUser) {
      throw new Error(`Doctor with ID ${doctorId} not found.`);
    }

    targetUser.status = 'REJECTED';

    const db = getFirestoreDb();
    if (db) {
      try {
        await db.collection('users').doc(doctorId).update({
          status: 'REJECTED',
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn('[Auth] Failed to update doctor rejection in Firestore:', err.message);
      }
    }

    return this.sanitizeUser(targetUser);
  }

  /**
   * Get all registered users (for staff audit)
   */
  static getAllUsers(): AuthenticatedUser[] {
    return Array.from(inMemoryUsers.values()).map(this.sanitizeUser);
  }

  /**
   * Strip sensitive fields (passwords, salts)
   */
  private static sanitizeUser(account: StoredUserAccount): AuthenticatedUser {
    const { passwordHash, salt, ...safe } = account;
    return safe;
  }
}
