import React, { useState } from 'react';
import { AlertCircle, X, ExternalLink, Settings } from 'lucide-react';
import { isWhatsAppConfigured, STORE_CONFIG } from '../config/store';

export const DeveloperSetupBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const isConfigured = isWhatsAppConfigured();

  if (isConfigured || dismissed) return null;

  return (
    <div className="bg-amber-600 text-white text-xs px-4 py-2.5 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Settings className="w-4 h-4 shrink-0 animate-spin-slow" />
          <span>
            <strong>मालिक के लिए ध्यान दें (Owner Setup):</strong> WhatsApp नंबर अभी डिफ़ॉल्ट पर है। 
            ऑर्डर प्राप्त करने के लिए <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono font-bold">src/config/store.js</code> में अपना नंबर दर्ज करें।
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="सूचना बंद करें"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
