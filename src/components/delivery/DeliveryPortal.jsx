import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  X,
  Package,
  ArrowRight,
  ExternalLink,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  api,
  getDeliveryToken,
  setDeliveryToken,
  SOCKET_URL,
} from '../../utils/api';
import { io } from 'socket.io-client';
import {
  deliverySound,
  requestNotificationPermission,
  showBrowserNotification,
  triggerVibration,
} from '../../utils/deliverySound';

export const DeliveryPortal = ({ onExit }) => {
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(getDeliveryToken());
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'delivered', 'all'
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sound and Real-time Assignment Notification state
  const [assignedAlert, setAssignedAlert] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => deliverySound.isSoundEnabled());
  const [isRinging, setIsRinging] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // PIN verification modal state
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);

  // Fetch assigned orders
  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await api.getAssignedDeliveryOrders(activeTab);
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      if (err.message && err.message.includes('401')) {
        handleLogout();
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [token, activeTab]);

  // Unlock browser audio context on user gesture (first click or touch)
  useEffect(() => {
    const handleGesture = () => {
      deliverySound.getAudioContext();
    };
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  // Trigger alert when an order is assigned to this partner
  const triggerAssignmentAlert = useCallback((payload) => {
    if (!payload) return;

    // 1. Synthesize bell chime audio alert
    deliverySound.playOrderRing(8000);
    setIsRinging(true);

    // 2. Hardware vibration
    triggerVibration([400, 200, 400, 200, 800]);

    // 3. System browser notification
    const orderNum = payload.orderNumber || payload.order?.orderNumber || '';
    const total = payload.finalTotal || payload.order?.finalTotal || '';
    const customer = payload.customerName || payload.order?.customerName || 'Customer';
    const address = payload.deliveryAddress || payload.order?.deliveryAddress || '';

    showBrowserNotification(`🚨 नया ऑर्डर असाइन हुआ! #${orderNum}`, {
      body: `राशि: ₹${total} • ग्राहक: ${customer}\nपता: ${address.slice(0, 50)}`,
      tag: `kirsab-order-${orderNum}`,
      onClick: () => {
        setAssignedAlert(payload);
        setActiveTab('active');
        deliverySound.stop();
        setIsRinging(false);
      },
    });

    // 4. In-app banner & switch to active orders
    setAssignedAlert(payload);
    setActiveTab('active');

    // 5. Reload orders list
    loadOrders();
  }, [loadOrders]);

  // Initial authentication check & Socket.IO initialization
  useEffect(() => {
    if (!token) return;

    // Load orders
    loadOrders();

    // Socket.IO for real-time delivery assignments and status changes
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('partner:join');
    });

    // High-priority event: an order was explicitly assigned to this delivery partner
    socket.on('partner:order_assigned', (payload) => {
      triggerAssignmentAlert(payload);
    });

    // Order updated event (e.g., status changes or assignments)
    socket.on('partner:order_updated', (payload) => {
      if (payload?.alert || payload?.historyEntry?.notes?.toLowerCase().includes('assign')) {
        triggerAssignmentAlert(payload);
      } else {
        loadOrders();
      }
    });

    socket.on('order:live_status', () => {
      loadOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, loadOrders, triggerAssignmentAlert]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await api.deliveryLogin({
        identifier: loginPhone.trim(),
        password: loginPassword,
      });

      if (res.success && res.token) {
        setDeliveryToken(res.token);
        setToken(res.token);
        setPartner(res.partner);
      }
    } catch (err) {
      setLoginError(err.message || 'लॉगिन विफल (Login failed)');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setDeliveryToken(null);
    setToken(null);
    setPartner(null);
    setOrders([]);
  };

  // Workflow Action 1: Accept
  const handleAccept = async (orderId) => {
    try {
      await api.acceptDeliveryOrder(orderId);
      loadOrders();
    } catch (err) {
      alert(err.message || 'त्रुटि');
    }
  };

  // Workflow Action 2: Pickup
  const handlePickup = async (orderId) => {
    try {
      await api.pickupDeliveryOrder(orderId);
      loadOrders();
    } catch (err) {
      alert(err.message || 'त्रुटि');
    }
  };

  // Workflow Action 3: Mark Out for Delivery
  const handleOutForDelivery = async (orderId) => {
    try {
      await api.outForDeliveryOrder(orderId);
      loadOrders();
    } catch (err) {
      alert(err.message || 'त्रुटि');
    }
  };

  // Workflow Action 4: Verify PIN & Deliver
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (!verifyingOrder) return;
    setPinError(null);
    setIsVerifying(true);

    try {
      const res = await api.verifyDeliveryPin(verifyingOrder.id, enteredPin);
      if (res.success) {
        setSuccessOrder(res.order || verifyingOrder);
        setVerifyingOrder(null);
        setEnteredPin('');
        loadOrders();
      }
    } catch (err) {
      setPinError(err.message || 'पिन सत्यापन विफल');
    } finally {
      setIsVerifying(false);
    }
  };

  // IF NOT LOGGED IN: SHOW DELIVERY PARTNER LOGIN FORM
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700 animate-fade-in">
          
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 p-8 text-white text-center relative">
            {onExit && (
              <button
                onClick={onExit}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-3">
              <Truck className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              KIRSAB डिलीवरी पार्टनर पोर्टल
            </h2>
            <p className="text-xs text-emerald-200/80 mt-1">
              शेरवानी लेगेसी, प्रयागराज • सुरक्षित डिलीवरी व पिन सत्यापन
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-4">
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                पंजीकृत मोबाइल नंबर (Mobile Number)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-black text-slate-500">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="9876543210"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                पासवर्ड (Password)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>डिलीवरी पोर्टल में प्रवेश करें</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-500 pt-2">
              नोट: डिलीवरी पार्टनर खाता केवल KIRSAB एडमिन द्वारा जारी किया जाता है।
            </p>
          </form>

        </div>
      </div>
    );
  }

  // IF LOGGED IN: DELIVERY PARTNER DASHBOARD
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white border-b border-emerald-900 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-white">
                  {partner?.name || 'डिलीवरी पार्टनर'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                  ऑनलाइन
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-mono">
                {partner?.vehicleType || 'Bike'} {partner?.vehicleNumber ? `• ${partner.vehicleNumber}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sound Mute/Unmute Toggle */}
            <button
              onClick={() => {
                const next = deliverySound.toggleSound();
                setSoundEnabled(next);
                if (next) deliverySound.testSound();
              }}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                soundEnabled
                  ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-600/60'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
              }`}
              title={soundEnabled ? 'साउंड ऑन है (Click to mute)' : 'साउंड म्यूट है (Click to unmute)'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
              <span className="hidden md:inline">{soundEnabled ? 'साउंड ऑन' : 'म्यूट'}</span>
            </button>

            {/* Test Bell Chime */}
            <button
              onClick={() => deliverySound.testSound()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5"
              title="टेस्ट रिंग (Test alert chime)"
            >
              <Bell className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">टेस्ट रिंग</span>
            </button>

            <button
              onClick={loadOrders}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">रीफ़्रेश</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">लॉगआउट</span>
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                title="Exit to Store"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Real-time Order Assignment Alert Banner with Ringing Chime */}
        {assignedAlert && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 p-4 sm:p-5 rounded-3xl shadow-xl text-white animate-fade-in border-2 border-white/30 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 ${isRinging ? 'animate-bounce' : ''}`}>
                  <BellRing className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-orange-900 text-[10px] font-black uppercase tracking-wider">
                      {assignedAlert.isReassignment ? 'पुनः असाइन (Reassigned)' : 'नया ऑर्डर (New Assigned)'}
                    </span>
                    {isRinging && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-100 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                        घंटी बज रही है...
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black mt-0.5">
                    ऑर्डर #{assignedAlert.orderNumber || assignedAlert.order?.orderNumber} (₹{assignedAlert.finalTotal || assignedAlert.order?.finalTotal})
                  </h3>
                  <p className="text-xs text-white/90 line-clamp-1">
                    ग्राहक: {assignedAlert.customerName || assignedAlert.order?.customerName} • {assignedAlert.deliveryAddress || assignedAlert.order?.deliveryAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isRinging && (
                  <button
                    onClick={() => {
                      deliverySound.stop();
                      setIsRinging(false);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>घंटी बंद करें</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    deliverySound.stop();
                    setIsRinging(false);
                    setAssignedAlert(null);
                    setActiveTab('active');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white text-orange-900 hover:bg-orange-50 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span>ऑर्डर देखें</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Browser Notification Permission Banner (if not yet granted) */}
        {notifPermission === 'default' && (
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-950 font-medium">
              <Bell className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>नया ऑर्डर आने पर लॉक स्क्रीन पर भी तुरंत घंटी और अलर्ट पाने के लिए अनुमति दें।</span>
            </div>
            <button
              onClick={async () => {
                const res = await requestNotificationPermission();
                setNotifPermission(res);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-bold shrink-0 hover:bg-emerald-800 transition-all shadow-xs"
            >
              अनुमति दें
            </button>
          </div>
        )}
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all ${
              activeTab === 'active'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            सक्रिय ऑर्डर्स (Active)
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all ${
              activeTab === 'delivered'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            पूर्ण डिलीवर (Delivered)
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            सभी ऑर्डर्स (All)
          </button>
        </div>

        {/* Orders List */}
        {loadingOrders ? (
          <div className="py-20 text-center">
            <span className="inline-block w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-500 mt-2">ऑर्डर्स लोड हो रहे हैं...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-slate-800">
              कोई असाइन किया गया ऑर्डर नहीं है
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              जैसे ही एडमिन द्वारा आपको नए ऑर्डर आवंटित किए जाएंगे, वे यहाँ तुरंत लाइव दिखाई देंगे।
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => {
              const isDelivered = ord.status === 'delivered';
              const isOut = ord.status === 'out_for_delivery';
              const isReady = ord.status === 'ready_for_dispatch';
              const isPreparing = ord.status === 'preparing';
              const isConfirmed = ord.status === 'confirmed';

              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        #{ord.orderNumber}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOut
                            ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400/50 animate-pulse'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 block">देय राशि</span>
                      <span className="text-lg font-black text-slate-900">₹{ord.finalTotal}</span>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">
                        {ord.paymentMethod} • {ord.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block mb-1">ग्राहक जानकारी</span>
                      <p className="font-extrabold text-sm text-slate-900">{ord.customerName}</p>
                      <a
                        href={`tel:${ord.customerPhone}`}
                        className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 border border-emerald-200"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+91 {ord.customerPhone} (कॉल करें)</span>
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block mb-1">डिलीवरी पता</span>
                      <p className="font-bold text-slate-900 leading-relaxed">
                        📍 {ord.address}
                      </p>
                      {ord.landmark && (
                        <p className="text-slate-600 mt-0.5">
                          📌 लैंडमार्क: <strong>{ord.landmark}</strong>
                        </p>
                      )}
                      <p className="text-emerald-800 font-bold mt-1">
                        ⏰ स्लॉट: {ord.deliverySlot}
                      </p>
                    </div>
                  </div>

                  {/* Special Delivery Instructions */}
                  {ord.instructions && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                      <strong>ग्राहक निर्देश:</strong> "{ord.instructions}"
                    </div>
                  )}

                  {/* Item List Summary */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 text-[11px] font-bold block mb-1">
                      सब्ज़ियाँ ({ord.items.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ord.items.map((it) => (
                        <span
                          key={it.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                        >
                          {it.productNameHi} × {it.quantity} {it.unit}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                    {/* Action 1: Accept */}
                    {(isConfirmed || ord.status === 'pending') && !ord.acceptedAt && (
                      <button
                        onClick={() => handleAccept(ord.id)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs"
                      >
                        ऑर्डर स्वीकार करें (Accept)
                      </button>
                    )}

                    {/* Action 2: Pick Up */}
                    {(isConfirmed || isPreparing) && (
                      <button
                        onClick={() => handlePickup(ord.id)}
                        className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs shadow-xs"
                      >
                        पिकअप करें (Mark Picked Up)
                      </button>
                    )}

                    {/* Action 3: Out for Delivery */}
                    {(isReady || isPreparing || (isConfirmed && ord.pickedUpAt)) && (
                      <button
                        onClick={() => handleOutForDelivery(ord.id)}
                        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
                      >
                        <Truck className="w-4 h-4" />
                        <span>डिलीवरी के लिए निकलें (Out for Delivery)</span>
                      </button>
                    )}

                    {/* Action 4: Verify PIN & Complete (MANDATORY PIN VERIFICATION) */}
                    {isOut && (
                      <button
                        onClick={() => {
                          setVerifyingOrder(ord);
                          setEnteredPin('');
                          setPinError(null);
                        }}
                        className="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md hover:shadow-lg flex items-center gap-2 transform active:scale-95"
                      >
                        <KeyRound className="w-4 h-4 text-emerald-300" />
                        <span>पिन सत्यापित कर डिलीवर करें (Verify PIN & Deliver)</span>
                      </button>
                    )}

                    {/* Completed Badge */}
                    {isDelivered && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>सफलतापूर्वक डिलीवर हो चुका है</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* PIN Verification Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700 relative">
            <button
              onClick={() => setVerifyingOrder(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                डिलीवरी पिन सत्यापन
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ऑर्डर #{verifyingOrder.orderNumber} • ग्राहक: <strong>{verifyingOrder.customerName}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs font-medium mb-5">
              ⚠️ <strong>आवश्यक नियम:</strong> ग्राहक के पते पर पहुँचने के बाद, ग्राहक से उनका <strong>6-अंकों का डिलीवरी पिन</strong> पूछें और यहाँ दर्ज करें।
            </div>

            {pinError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 text-center mb-2">
                  6-अंकों का पिन दर्ज करें (Enter 6-Digit PIN)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="• • • • • •"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full py-3.5 text-center font-mono font-black text-2xl tracking-[0.3em] rounded-2xl border-2 border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 bg-slate-50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isVerifying || enteredPin.length !== 6}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isVerifying ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>पिन सत्यापित करें व डिलीवरी पूर्ण करें</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyingOrder(null)}
                  className="px-4 py-3.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  रद्द
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Success Celebration Popup */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-emerald-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              डिलीवरी सफलतापूर्वक पूर्ण!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ऑर्डर #{successOrder.orderNumber} का पिन सत्यापित हो चुका है और ग्राहक को ताज़ा सब्ज़ियाँ सुपुर्द कर दी गई हैं।
            </p>
            <button
              onClick={() => setSuccessOrder(null)}
              className="mt-6 w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md"
            >
              ठीक है (Continue)
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
