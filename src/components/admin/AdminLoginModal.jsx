import React, { useState } from 'react';
import { X, Lock, Mail, AlertCircle, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { api, setAdminToken } from '../../utils/api';

export const AdminLoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('कृपया ईमेल और पासवर्ड दर्ज करें');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.login({ email: email.trim(), password });
      if (response.success && response.token) {
        setAdminToken(response.token);
        if (onLoginSuccess) {
          onLoginSuccess(response.user);
        }
        onClose();
      } else {
        setError(response.message || 'लॉगिन विफल रहा');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'गलत ईमेल या पासवर्ड');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-4 text-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl text-left overflow-hidden transform transition-all relative border border-brand-border">
          
          {/* Header */}
          <div className="p-5 sm:p-6 bg-brand-dark text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">KIRSAB एडमिन पोर्टल</h3>
                <p className="text-xs text-white/80">स्टोर प्रबंधक व मालिक लॉगिन</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal mb-1">
                एडमिन ईमेल (Admin Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kirsab.in"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-brand-charcoal mb-1">
                पासवर्ड (Password)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark"
                />
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-dark hover:bg-brand-hover disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>प्रमाणीकरण हो रहा है...</span>
                ) : (
                  <>
                    <span>सुरक्षित लॉगिन करें</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Safe Documentation Note */}
            <div className="p-3 rounded-xl bg-brand-soft/60 border border-brand-border text-[11px] text-brand-muted space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-brand-dark">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-fresh" />
                <span>सुरक्षित एडमिन क्रेडेंशियल</span>
              </div>
              <p>
                डिफ़ॉल्ट एडमिन क्रेडेंशियल बदलने या नया खाता बनाने हेतु कमांड लाइन में <code className="bg-white px-1 py-0.5 rounded font-mono text-brand-dark">node scripts/createAdmin.js</code> चलाएं।
              </p>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
