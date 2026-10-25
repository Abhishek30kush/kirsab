import React, { useState } from 'react';
import { X, Lock, Phone, User, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useLanguage } from '../../context/LanguageContext';

export const CustomerAuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginCustomer, registerCustomer } = useCustomer();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const cleanPhone = formData.phone.trim();
        if (!cleanPhone) throw new Error(isHi ? 'कृपया मोबाइल नंबर दर्ज करें' : 'Phone number is required');
        if (!formData.password) throw new Error(isHi ? 'कृपया पासवर्ड दर्ज करें' : 'Password is required');

        await loginCustomer(cleanPhone, formData.password);
      } else {
        // Register validation
        if (!formData.name || formData.name.trim().length < 2) {
          throw new Error(isHi ? 'कृपया अपना पूरा नाम लिखें' : 'Full name is required (min 2 chars)');
        }
        const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
          throw new Error(isHi ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें' : '10-digit mobile number required');
        }
        if (!formData.password || formData.password.length < 6) {
          throw new Error(isHi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters');
        }

        await registerCustomer({
          name: formData.name,
          phone: cleanPhone,
          email: formData.email,
          password: formData.password,
        });
      }
    } catch (err) {
      setError(err.message || (isHi ? 'प्रमाणीकरण विफल' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-brand-border/60 overflow-hidden transform transition-all">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 text-white relative">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isHi ? 'सुरक्षित ग्राहक खाता' : 'Secure Customer Account'}</span>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-white">
            {mode === 'login'
              ? (isHi ? 'किरसाब में लॉगिन करें' : 'Sign in to KIRSAB')
              : (isHi ? 'नया खाता बनाएं' : 'Create an Account')}
          </h3>
          <p className="text-xs text-emerald-100/80 mt-1">
            {isHi
              ? 'सहेजे गए पते, लाइव ऑर्डर ट्रैकिंग और 6-अंकों का सुरक्षित डिलीवरी पिन'
              : 'Saved addresses, live order tracking & secure delivery PIN'}
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex bg-black/20 p-1 rounded-xl mt-5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isHi ? 'लॉगिन करें' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isHi ? 'नया खाता बनाएं' : 'Register'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Full Name for Register */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-1.5">
                {isHi ? 'पूरा नाम' : 'Full Name'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={isHi ? 'उदा. राहुल शर्मा' : 'e.g. Rahul Sharma'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-brand-light/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5">
              {isHi ? 'मोबाइल नंबर' : 'Mobile Number'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 flex items-center gap-1 text-xs font-extrabold text-brand-charcoal">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>+91</span>
              </div>
              <input
                type="tel"
                name="phone"
                maxLength={10}
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full pl-16 pr-4 py-2.5 rounded-xl border border-brand-border bg-brand-light/50 text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Email (Optional for Register) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-1.5">
                {isHi ? 'ईमेल (वैकल्पिक)' : 'Email (Optional)'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-brand-muted" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="rahul@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-brand-light/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1.5">
              {isHi ? 'पासवर्ड' : 'Password'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-brand-muted" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isHi ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-brand-light/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-brand-dark hover:bg-brand-hover active:scale-[0.99] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'login'
                    ? (isHi ? 'लॉगिन करें' : 'Sign In')
                    : (isHi ? 'खाता बनाएं और आगे बढ़ें' : 'Create Account & Continue')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-brand-muted pt-2">
            {isHi
              ? 'शेरवानी लेगेसी, प्रयागराज के निवासियों के लिए विशेष ताज़ा सब्ज़ी सेवा।'
              : 'Hyperlocal fresh vegetable delivery for Shervani Legacy, Prayagraj.'}
          </p>
        </form>
      </div>
    </div>
  );
};
