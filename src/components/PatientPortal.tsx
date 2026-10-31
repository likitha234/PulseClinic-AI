import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  Stethoscope,
  MapPin,
  Mail,
  RefreshCw,
  FileText,
  HeartPulse,
  Info,
  XCircle,
  Check,
} from 'lucide-react';
import {
  Patient,
  Doctor,
  DoctorSlot,
  Appointment,
  TriageAssessment,
} from '../types/index.ts';
import { EmergencyBanner } from './EmergencyBanner.tsx';

interface PatientPortalProps {
  currentPatient: Patient | null;
  onUpdatePatient: (patient: Patient) => void;
  onRefreshData: () => void;
  doctors: Doctor[];
  appointments: Appointment[];
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  currentPatient,
  onUpdatePatient,
  onRefreshData,
  doctors,
  appointments,
}) => {
  // Navigation sub-views: 'intake-chat' | 'history' | 'profile'
  const [activeSubTab, setActiveSubTab] = useState<'intake-chat' | 'history' | 'profile'>('intake-chat');

  // Intake / Identification state
  const [patientType, setPatientType] = useState<'returning' | 'new'>(
    currentPatient?.isReturning ? 'returning' : 'new'
  );
  const [returningLookupQuery, setReturningLookupQuery] = useState('eleanor.hughes@example.com');
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // New patient intake form state
  const [fullName, setFullName] = useState(currentPatient?.fullName || '');
  const [email, setEmail] = useState(currentPatient?.email || '');
  const [phone, setPhone] = useState(currentPatient?.phone || '');
  const [age, setAge] = useState<number | string>(currentPatient?.age || 32);
  const [allergiesInput, setAllergiesInput] = useState('');
  const [medicationsInput, setMedicationsInput] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);

  // Chat conversation state
  const [messages, setMessages] = useState<
    { sender: 'assistant' | 'patient'; text: string; timestamp: string }[]
  >([
    {
      sender: 'assistant',
      text: currentPatient?.isReturning
        ? `Hello ${currentPatient.fullName}! Welcome back to PulseCare Clinic. I see your previous medical records on file (Allergies: ${currentPatient.medicalHistory.allergies.join(', ') || 'None listed'}). Please confirm your information above, or describe what symptoms you are experiencing today.`
        : `Hello! I am your PulseClinic Intake & Triage Assistant. To get started, please share your primary symptom or reason for today's visit. (One concern at a time).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Agentic & Triage outcome state
  const [triageAssessment, setTriageAssessment] = useState<TriageAssessment | null>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<{ triggered: boolean; symptoms: string[]; rationale: string } | null>(null);
  const [prescriptionRefused, setPrescriptionRefused] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Available slots for booking
  const [availableSlots, setAvailableSlots] = useState<DoctorSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DoctorSlot | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<Appointment | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Reschedule state
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [alternativeSlots, setAlternativeSlots] = useState<DoctorSlot[]>([]);
  const [selectedAlternativeSlot, setSelectedAlternativeSlot] = useState<string>('');
  const [rebookingLoading, setRebookingLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle Returning Patient Lookup
  const handleLookupReturningPatient = async () => {
    if (!returningLookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await fetch('/api/patients/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: returningLookupQuery }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onUpdatePatient(data.data);
        setFullName(data.data.fullName);
        setEmail(data.data.email);
        setPhone(data.data.phone);
        setAge(data.data.age || 40);

        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `Welcome back, ${data.data.fullName}! I have retrieved your medical records from Firestore. Verified previous visits: ${data.data.medicalHistory.previousVisitsCount}. Noted allergies: ${data.data.medicalHistory.allergies.join(', ') || 'None'}. Please describe what brings you in today.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setLookupError('Patient record not found. Please verify email/phone or register as a new patient.');
      }
    } catch (err: any) {
      setLookupError('Failed to connect to patient records service.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Send message to Gemini Intake Agent
  const handleSendMessage = async (textToSend?: string) => {
    const patientText = (textToSend || inputMessage).trim();
    if (!patientText || isProcessing) return;

    setInputMessage('');
    setChatError(null);
    setLastFailedMessage(null);
    setPrescriptionRefused(false);

    // Append patient message immediately
    const newMsg = {
      sender: 'patient' as const,
      text: patientText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);

    setIsProcessing(true);

    try {
      // Build conversation context
      const conversationHistory = updatedMessages.slice(-10).map((m) => ({
        role: m.sender === 'patient' ? 'patient' : 'assistant',
        text: m.text,
      }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `sess-${Date.now()}`,
          patientId: currentPatient?.id,
          message: patientText,
          conversationHistory,
          currentIntake: {
            fullName: fullName || currentPatient?.fullName || 'Anonymous Patient',
            email: email || currentPatient?.email || 'patient@example.com',
            phone: phone || currentPatient?.phone || '+1 555-0100',
            age: Number(age) || 35,
          },
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { reply, redFlagTriggered, prescriptionRefusal, triageAssessment: triage, availableSlots: slots } = json.data;

        if (redFlagTriggered) {
          setEmergencyAlert({
            triggered: true,
            symptoms: [patientText],
            rationale: 'Critical emergency red-flag indicators detected in patient input.',
          });
        }

        if (prescriptionRefusal) {
          setPrescriptionRefused(true);
        }

        if (triage) {
          setTriageAssessment(triage);
        }

        if (slots && slots.length > 0) {
          setAvailableSlots(slots);
        }

        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        const errMsg = json.error || 'The AI assistant encountered an issue generating a response.';
        setChatError(errMsg);
        setLastFailedMessage(patientText);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `⚠️ I encountered an error connecting to the intake model (${errMsg}). Please use the retry button below.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Service connectivity error';
      setChatError(errMsg);
      setLastFailedMessage(patientText);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `⚠️ Network error: ${errMsg}. Please click retry to resend.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
      onRefreshData();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Book an appointment slot
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setIsBooking(true);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentPatient?.id || `pat-${Date.now()}`,
          patientName: fullName || currentPatient?.fullName || 'Valued Patient',
          patientEmail: email || currentPatient?.email || 'patient@example.com',
          patientPhone: phone || currentPatient?.phone || '+1 (555) 234-5678',
          slotId: selectedSlot.slotId,
          chiefComplaint: triageAssessment?.primaryComplaint || 'Routine specialist consultation',
          urgency: triageAssessment?.urgency || 'GREEN',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setBookingConfirmed(json.data);
        setSelectedSlot(null);
        setAvailableSlots([]);
        onRefreshData();

        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `🎉 Success! Your appointment has been officially confirmed with ${json.data.doctorName} for ${json.data.date} at ${json.data.time}. Booking Reference: ${json.data.bookingId}. A confirmation email notification has been dispatched to ${json.data.patientEmail}.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        alert(json.error || 'Failed to book slot.');
      }
    } catch (err: any) {
      alert(`Booking error: ${err.message}`);
    } finally {
      setIsBooking(false);
    }
  };

  // Open Rebook Modal
  const handleOpenReschedule = async (apt: Appointment) => {
    setRescheduleAppointment(apt);
    setSelectedAlternativeSlot('');
    try {
      const res = await fetch(`/api/appointments/${apt.id}/alternatives`);
      const data = await res.json();
      if (data.success && data.data) {
        setAlternativeSlots(data.data);
      }
    } catch (err) {
      console.error('Error fetching alternatives:', err);
    }
  };

  // Submit Rebook
  const handleExecuteRebooking = async () => {
    if (!rescheduleAppointment || !selectedAlternativeSlot) return;
    setRebookingLoading(true);

    try {
      const res = await fetch(`/api/appointments/${rescheduleAppointment.id}/rebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSlotId: selectedAlternativeSlot,
          authorizedByPatient: true,
          reason: 'Patient requested schedule adjustment via patient portal',
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        alert(`Appointment successfully rebooked! New Booking ID: ${data.data.newAppointment.bookingId}`);
        setRescheduleAppointment(null);
        onRefreshData();
      } else {
        alert(data.error || 'Failed to rebook appointment.');
      }
    } catch (err: any) {
      alert(`Rebooking error: ${err.message}`);
    } finally {
      setRebookingLoading(false);
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (aptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment? This action will immediately release your slot.')) return;
    try {
      const res = await fetch(`/api/appointments/${aptId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Patient cancelled via portal' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Appointment successfully cancelled.');
        onRefreshData();
      }
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  // Filter patient's appointments
  const myAppointments = appointments.filter(
    (a) =>
      a.patientEmail.toLowerCase() === (currentPatient?.email || email).toLowerCase() ||
      a.patientId === currentPatient?.id
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Emergency Alert Banner if triggered */}
      {emergencyAlert && (
        <EmergencyBanner
          detectedSymptoms={emergencyAlert.symptoms}
          rationale={emergencyAlert.rationale}
        />
      )}

      {/* Prescription Refusal Notice */}
      {prescriptionRefused && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Safety Guardrail: Clinical Prescription Policy</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                "I cannot prescribe medication or recommend prescription dosages. A qualified healthcare professional must assess your condition. I can help arrange a consultation."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Portal Header & Sub-nav */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Patient Consultation & Intake Portal</span>
            {currentPatient?.isReturning && (
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-300">
                Returning Patient
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active Patient: <strong className="text-slate-800">{currentPatient?.fullName || fullName || 'Unregistered'}</strong> ({currentPatient?.email || email || 'No email'})
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('intake-chat')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'intake-chat' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intake Chat & Booking
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
              activeSubTab === 'history' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My Appointments</span>
            {myAppointments.length > 0 && (
              <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {myAppointments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'profile' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Medical Memory
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: INTAKE CHAT & BOOKING */}
      {activeSubTab === 'intake-chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Patient Identity & Intake Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Identification Toggle Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <User className="w-4 h-4 mr-2 text-teal-600" />
                Patient Identification
              </h2>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPatientType('returning')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    patientType === 'returning'
                      ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Returning Patient
                </button>
                <button
                  type="button"
                  onClick={() => setPatientType('new')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    patientType === 'new'
                      ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  New Patient
                </button>
              </div>

              {/* Returning Patient Lookup Form */}
              {patientType === 'returning' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Lookup by Email or Phone
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={returningLookupQuery}
                        onChange={(e) => setReturningLookupQuery(e.target.value)}
                        placeholder="e.g. eleanor.hughes@example.com"
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                      />
                      <button
                        onClick={handleLookupReturningPatient}
                        disabled={lookupLoading}
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {lookupLoading ? '...' : 'Verify'}
                      </button>
                    </div>
                  </div>

                  {lookupError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{lookupError}</p>
                  )}

                  {currentPatient?.isReturning && (
                    <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 text-xs space-y-1">
                      <p className="font-semibold text-teal-900 flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 text-teal-600 mr-1.5" />
                        Verified: {currentPatient.fullName}
                      </p>
                      <p className="text-slate-600">Allergies: {currentPatient.medicalHistory.allergies.join(', ') || 'None'}</p>
                      <p className="text-slate-600">Medications: {currentPatient.medicalHistory.currentMedications.join(', ') || 'None'}</p>
                      <p className="text-slate-500 text-[11px]">Last visit: {currentPatient.medicalHistory.lastVisitDate || '2026-08-14'}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* New Patient Intake Form */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Liam Henderson"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@email.com"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555-0199"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Known Allergies</label>
                      <input
                        type="text"
                        value={allergiesInput}
                        onChange={(e) => setAllergiesInput(e.target.value)}
                        placeholder="e.g. Penicillin, Latex"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start space-x-2 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>I consent to storage of clinical intake data for triage and appointment scheduling.</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Current Triage Assessment Card */}
            {triageAssessment && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <HeartPulse className="w-4 h-4 mr-2 text-teal-600" />
                    Clinical Triage Status
                  </h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      triageAssessment.urgency === 'RED'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : triageAssessment.urgency === 'ORANGE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {triageAssessment.urgency} : {triageAssessment.urgency === 'RED' ? 'Emergency' : triageAssessment.urgency === 'ORANGE' ? 'Urgent' : 'Routine'}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p><strong>Chief Complaint:</strong> {triageAssessment.primaryComplaint}</p>
                  <p><strong>Matched Specialist:</strong> <span className="text-teal-700 font-semibold">{triageAssessment.recommendedSpecialty}</span></p>
                  <p className="text-[11px] text-slate-500">{triageAssessment.clinicalRationale}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Interactive Adaptive Chat & Slot Booking (8 cols) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            {/* Chat Conversation Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[520px]">
              {/* Chat Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800">
                    PulseClinic Intake Assistant (Gemini Multi-Step Engine)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Interactive Intake • Enter to send</span>
              </div>

              {/* Chat Messages Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${m.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        m.sender === 'patient'
                          ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-none'
                          : 'bg-slate-50 text-slate-800 rounded-bl-none border border-slate-200/90'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <span
                        className={`block text-[10px] mt-1.5 font-medium ${
                          m.sender === 'patient' ? 'text-teal-100 text-right' : 'text-slate-400'
                        }`}
                      >
                        {m.timestamp}
                      </span>
                    </div>
                    {m.sender === 'patient' && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0 mt-0.5">
                        {fullName ? fullName.slice(0, 1).toUpperCase() : 'ME'}
                      </div>
                    )}
                  </div>
                ))}

                {/* Animated Typing Indicator */}
                {isProcessing && (
                  <div className="flex justify-start items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                      <Stethoscope className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-slate-600 flex items-center space-x-2 border border-slate-200 shadow-2xs">
                      <span className="font-medium">PulseClinic is thinking</span>
                      <span className="flex space-x-1 pt-1">
                        <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce"></span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Error banner with retry button */}
              {chatError && (
                <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{chatError}</span>
                  </div>
                  {lastFailedMessage && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage(lastFailedMessage)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11px] shrink-0 ml-2"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Quick Input Suggestions */}
              <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-slate-400 py-0.5">Quick prompts:</span>
                <button
                  type="button"
                  onClick={() => setInputMessage('I have had a headache since yesterday.')}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-2xs"
                >
                  Headache since yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage('It is a throbbing ache on the right side of my head.')}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-2xs"
                >
                  Right-side throbbing
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage('Itchy skin rash on my forearm after gardening')}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-colors shadow-2xs"
                >
                  Skin rash
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage('Please prescribe me amoxicillin antibiotics')}
                  className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
                  title="Test prescription refusal guardrail"
                >
                  Rx Request Test
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage('Severe chest pain radiating to my left arm')}
                  className="px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 hover:bg-red-100 transition-colors shadow-2xs"
                  title="Test emergency red flag detection"
                >
                  Red Flag Test
                </button>
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <textarea
                  rows={1}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your symptom or message... (Enter to send, Shift+Enter for new line)"
                  disabled={isProcessing}
                  className="flex-1 text-xs sm:text-sm px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden resize-none min-h-[42px] max-h-24 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputMessage.trim()}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Thinking</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Doctor Slot Picker Card (Rendered when slots are verified by Agent) */}
            {availableSlots.length > 0 && !bookingConfirmed && (
              <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-teal-600" />
                      Verified Available Consultation Slots
                    </h3>
                    <p className="text-xs text-slate-500">
                      Slots checked with Calendar API and verified via Browserbase session.
                    </p>
                  </div>
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-md font-semibold">
                    {availableSlots.length} Open Slots
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot?.slotId === slot.slotId;
                    return (
                      <button
                        key={slot.slotId}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-300'
                            : 'bg-slate-50 hover:bg-teal-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{slot.doctorName}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                          {slot.specialty}
                        </div>
                        <div className="mt-1.5 flex items-center space-x-1 font-mono text-xs font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>{slot.date} at {slot.startTime}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedSlot && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-xs text-teal-950">
                      <p>
                        Selected: <strong>{selectedSlot.doctorName}</strong> on <strong>{selectedSlot.date}</strong> at <strong>{selectedSlot.startTime}</strong>
                      </p>
                      <p className="text-[11px] text-teal-800">
                        Will be persisted to Cloud Firestore & trigger Resend confirmation email.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmBooking}
                      disabled={isBooking}
                      className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isBooking ? 'Locking Slot...' : 'Confirm Appointment'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Official Booking Confirmation Card */}
            {bookingConfirmed && (
              <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4">
                <div className="flex items-center space-x-3 border-b border-emerald-100 pb-4">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Booking Confirmed & Verified
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      Consultation Successfully Scheduled!
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Booking Reference ID:</span>
                    <span className="font-mono text-base font-bold text-teal-700">{bookingConfirmed.bookingId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Doctor & Specialty:</span>
                    <span className="font-semibold text-slate-800">{bookingConfirmed.doctorName} ({bookingConfirmed.doctorSpecialty})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Scheduled Date & Time:</span>
                    <span className="font-semibold text-slate-800">{bookingConfirmed.date} at {bookingConfirmed.time}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Clinic Location:</span>
                    <span className="font-semibold text-slate-800">{bookingConfirmed.clinicAddress}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Patient Instructions:</strong> Please arrive <strong>15 minutes prior</strong> for clinical intake registration. A confirmation email has been logged to your email address ({bookingConfirmed.patientEmail}).
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setBookingConfirmed(null);
                      setActiveSubTab('history');
                    }}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
                  >
                    View in My Appointments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: MY APPOINTMENTS & RESCHEDULING */}
      {activeSubTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Appointment History</h2>
              <p className="text-xs text-slate-500">
                Manage upcoming appointments, view booking codes, and request authorized rescheduling.
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab('intake-chat')}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
            >
              Book Another Appointment
            </button>
          </div>

          {myAppointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Calendar className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm">No appointments found under your profile.</p>
              <button
                onClick={() => setActiveSubTab('intake-chat')}
                className="text-xs text-teal-600 font-bold hover:underline"
              >
                Start an intake chat to book now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-teal-700">{apt.bookingId}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : apt.status === 'REBOOKED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {apt.status}
                      </span>
                      {apt.rescheduledFromBookingId && (
                        <span className="text-[10px] text-slate-500">
                          (Rebooked from {apt.rescheduledFromBookingId})
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">
                      {apt.doctorName} • <span className="text-slate-600 font-normal">{apt.doctorSpecialty}</span>
                    </h4>

                    <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {apt.date} at {apt.time}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {apt.clinicAddress}
                      </span>
                    </div>

                    {apt.cancellationReason && (
                      <p className="text-xs text-red-600 mt-1">Note: {apt.cancellationReason}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {apt.status === 'CONFIRMED' && (
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                      <button
                        onClick={() => handleOpenReschedule(apt)}
                        className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 text-xs font-semibold rounded-lg shadow-2xs"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg shadow-2xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reschedule Modal */}
          {rescheduleAppointment && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Reschedule Booking: {rescheduleAppointment.bookingId}
                  </h3>
                  <button
                    onClick={() => setRescheduleAppointment(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-600">
                  Select an authorized replacement slot with <strong>{rescheduleAppointment.doctorSpecialty}</strong>. The old slot will be atomically released and your confirmation email will be updated.
                </p>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {alternativeSlots.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Checking alternative slots...</p>
                  ) : (
                    alternativeSlots.map((slot) => (
                      <label
                        key={slot.slotId}
                        className={`block p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedAlternativeSlot === slot.slotId
                            ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold ring-1 ring-teal-400'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="replacementSlot"
                          value={slot.slotId}
                          checked={selectedAlternativeSlot === slot.slotId}
                          onChange={(e) => setSelectedAlternativeSlot(e.target.value)}
                          className="mr-2 text-teal-600"
                        />
                        {slot.doctorName} • {slot.date} at {slot.startTime} ({slot.specialty})
                      </label>
                    ))
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setRescheduleAppointment(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleExecuteRebooking}
                    disabled={!selectedAlternativeSlot || rebookingLoading}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-40"
                  >
                    {rebookingLoading ? 'Processing Rebook...' : 'Confirm Authorized Rebooking'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: MEDICAL MEMORY & PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Firestore Patient Memory Profile</h2>
            <p className="text-xs text-slate-500">
              Persistent clinical history across visits to prevent redundant questioning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                Patient Identity & Consent
              </h3>
              <p><strong>Full Name:</strong> {currentPatient?.fullName || fullName || 'Not provided'}</p>
              <p><strong>Email Address:</strong> {currentPatient?.email || email || 'Not provided'}</p>
              <p><strong>Phone:</strong> {currentPatient?.phone || phone || 'Not provided'}</p>
              <p><strong>Age:</strong> {currentPatient?.age || age || 'Not specified'}</p>
              <p>
                <strong>Consent:</strong>{' '}
                <span className="text-emerald-700 font-semibold">
                  {currentPatient?.consentGiven ? 'Signed & Stored' : 'Pending in Session'}
                </span>
              </p>
            </div>

            {/* Medical History */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                Medical Records & Memory
              </h3>
              <div>
                <strong>Documented Allergies:</strong>
                <p className="text-red-700 font-semibold mt-0.5">
                  {currentPatient?.medicalHistory?.allergies?.join(', ') || 'No known allergies documented'}
                </p>
              </div>
              <div>
                <strong>Active Medications:</strong>
                <p className="text-slate-700 mt-0.5">
                  {currentPatient?.medicalHistory?.currentMedications?.join(', ') || 'None reported'}
                </p>
              </div>
              <div>
                <strong>Chronic Conditions:</strong>
                <p className="text-slate-700 mt-0.5">
                  {currentPatient?.medicalHistory?.chronicConditions?.join(', ') || 'None documented'}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Previous clinic encounters: {currentPatient?.medicalHistory?.previousVisitsCount || 0} visits
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
