import React from 'react';
import { AlertOctagon, PhoneCall, ShieldAlert } from 'lucide-react';

interface EmergencyBannerProps {
  onDismiss?: () => void;
  detectedSymptoms?: string[];
  rationale?: string;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  detectedSymptoms = ['Severe chest pain / respiratory distress'],
  rationale = 'Critical red flag detected by clinical triage protocol. Immediate emergency escalation required.',
}) => {
  return (
    <div className="bg-red-600 text-white p-4 sm:p-5 rounded-2xl shadow-xl border-2 border-red-700 animate-pulse-subtle">
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 bg-red-700 rounded-xl shrink-0">
          <AlertOctagon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="bg-white text-red-700 text-xs font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              Emergency Escalation Active
            </span>
            <span className="text-xs text-red-100 font-semibold">Triage Urgency: RED</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold mt-1 text-white">
            Immediate Emergency Medical Attention Required
          </h3>

          <p className="text-sm text-red-100 mt-1.5 leading-relaxed">
            {rationale}
          </p>

          {detectedSymptoms.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="text-xs text-red-200">Flagged Indicators:</span>
              {detectedSymptoms.map((sym, i) => (
                <span
                  key={i}
                  className="bg-red-800/80 text-white text-xs px-2 py-0.5 rounded-md font-mono border border-red-400/30"
                >
                  {sym}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3.5 border-t border-red-500/50 flex flex-wrap items-center gap-3">
            <a
              href="tel:911"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold text-sm shadow-md transition-transform active:scale-95"
            >
              <PhoneCall className="w-4 h-4 mr-2" />
              Call Emergency (911) Now
            </a>

            <div className="text-xs text-red-100">
              <span className="font-semibold">Clinic Action:</span> Front desk and triage nurse alerted. Regular outpatient booking suspended for patient safety.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
