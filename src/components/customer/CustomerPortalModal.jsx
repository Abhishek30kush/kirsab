import React, { useState } from 'react';
import {
  X,
  Package,
  MapPin,
  User,
  LogOut,
  Clock,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Phone,
  Trash2,
  Plus,
  Edit2,
  ChevronRight,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useCustomer } from '../../context/CustomerContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../utils/api';

const STATUS_STEPS = [
  { key: 'pending', labelHi: 'ऑर्डर दर्ज', labelEn: 'Placed' },
  { key: 'confirmed', labelHi: 'स्वीकृत', labelEn: 'Confirmed' },
  { key: 'preparing', labelHi: 'तैयारी में', labelEn: 'Preparing' },
  { key: 'ready_for_dispatch', labelHi: 'डिस्पैच हेतु तैयार', labelEn: 'Ready' },
  { key: 'out_for_delivery', labelHi: 'डिलीवरी हेतु रवाना', labelEn: 'Out for Delivery' },
  { key: 'delivered', labelHi: 'सफलतापूर्वक डिलीवर', labelEn: 'Delivered' },
];

export const CustomerPortalModal = () => {
  const {
    isCustomerPortalOpen,
    setIsCustomerPortalOpen,
    customerUser,
    addresses,
    orders,
    activePortalTab,
    setActivePortalTab,
    logoutCustomer,
    refreshCustomerData,
    refreshCustomerOrders,
  } = useCustomer();
  const { language } = useLanguage();
  const isHi = language === 'hi';

  // Address form modal state
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    flatNumber: '',
    street: '',
    locality: 'Shervani Legacy',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    pincode: '211011',
    landmark: '',
    deliveryInstructions: '',
    isDefault: false,
  });

  // Profile edit state
  const [profileName, setProfileName] = useState(customerUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(customerUser?.email || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Cancellation state
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  if (!isCustomerPortalOpen || !customerUser) return null;

  // Open address edit
  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label || 'Home',
      flatNumber: addr.flatNumber || '',
      street: addr.street || '',
      locality: addr.locality || 'Shervani Legacy',
      city: addr.city || 'Prayagraj',
      state: addr.state || 'Uttar Pradesh',
      pincode: addr.pincode || '211011',
      landmark: addr.landmark || '',
      deliveryInstructions: addr.deliveryInstructions || '',
      isDefault: Boolean(addr.isDefault),
    });
    setIsAddressFormOpen(true);
  };

  // Open address new
  const handleOpenNewAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      label: 'Home',
      flatNumber: '',
      street: '',
      locality: 'Shervani Legacy',
      city: 'Prayagraj',
      state: 'Uttar Pradesh',
      pincode: '211011',
      landmark: '',
      deliveryInstructions: '',
      isDefault: addresses.length === 0,
    });
    setIsAddressFormOpen(true);
  };

  // Save address (create or update)
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await api.updateCustomerAddress(editingAddress.id, addressForm);
      } else {
        await api.createCustomerAddress(addressForm);
      }
      setIsAddressFormOpen(false);
      refreshCustomerData();
    } catch (err) {
      alert(err.message || 'पते को सहेजने में त्रुटि');
    }
  };

  // Delete address
  const handleDeleteAddress = async (id) => {
    if (!window.confirm(isHi ? 'क्या आप इस पते को हटाना चाहते हैं?' : 'Delete this address?')) return;
    try {
      await api.deleteCustomerAddress(id);
      refreshCustomerData();
    } catch (err) {
      alert(err.message || 'त्रुटि');
    }
  };

  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      await api.updateCustomerProfile({ name: profileName, email: profileEmail });
      setProfileMsg({ type: 'success', text: isHi ? 'प्रोफ़ाइल अपडेट हो गई!' : 'Profile updated!' });
      refreshCustomerData();
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel order
  const handleConfirmCancel = async (orderId) => {
    try {
      await api.cancelCustomerOrder(orderId, cancelReason || 'Cancelled by customer');
      setCancellingOrderId(null);
      setCancelReason('');
      refreshCustomerOrders();
    } catch (err) {
      alert(err.message || 'ऑर्डर रद्द करने में त्रुटि');
    }
  };

  const getStepIndex = (status) => {
    const idx = STATUS_STEPS.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-brand-charcoal/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-brand-border/60 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-brand-charcoal text-white p-5 sm:p-6 shrink-0 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 font-extrabold text-xl shadow-inner">
              {customerUser.name ? customerUser.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {customerUser.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/20">
                  {isHi ? 'सत्यापित ग्राहक' : 'Verified Customer'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-mono mt-0.5">
                +91 {customerUser.phone} {customerUser.email ? `• ${customerUser.email}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logoutCustomer}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white/80 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 border border-white/10"
              title={isHi ? 'लॉगआउट करें' : 'Logout'}
            >
              <LogOut className="w-4 h-4 text-rose-300" />
              <span className="hidden sm:inline">{isHi ? 'लॉगआउट' : 'Sign Out'}</span>
            </button>
            <button
              onClick={() => setIsCustomerPortalOpen(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-brand-border bg-brand-light/60 px-6 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActivePortalTab('orders')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-all ${
              activePortalTab === 'orders'
                ? 'border-emerald-700 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-brand-muted hover:text-brand-charcoal'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-700" />
            <span>{isHi ? 'मेरे ऑर्डर्स' : 'My Orders'}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActivePortalTab('addresses')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-all ${
              activePortalTab === 'addresses'
                ? 'border-emerald-700 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-brand-muted hover:text-brand-charcoal'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>{isHi ? 'सहेजे गए पते' : 'Saved Addresses'}</span>
            <span className="px-2 py-0.5 rounded-full bg-brand-soft text-brand-charcoal text-[11px] font-black">
              {addresses.length}
            </span>
          </button>

          <button
            onClick={() => setActivePortalTab('profile')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-all ${
              activePortalTab === 'profile'
                ? 'border-emerald-700 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-brand-muted hover:text-brand-charcoal'
            }`}
          >
            <User className="w-4 h-4 text-emerald-700" />
            <span>{isHi ? 'प्रोफ़ाइल विवरण' : 'Profile'}</span>
          </button>
        </div>

        {/* Tab Contents Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-brand-light/30">
          
          {/* TAB 1: MY ORDERS & LIVE PIN TRACKER */}
          {activePortalTab === 'orders' && (
            <div className="space-y-5">
              {orders.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-brand-border">
                  <Package className="w-12 h-12 text-emerald-700/40 mx-auto mb-3" />
                  <h4 className="font-extrabold text-base text-brand-dark">
                    {isHi ? 'अभी तक कोई ऑर्डर दर्ज नहीं है' : 'No orders yet'}
                  </h4>
                  <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
                    {isHi
                      ? 'अपनी ताज़ा सब्ज़ियाँ कार्ट में जोड़ें और तुरंत ऑर्डर करें।'
                      : 'Add fresh vegetables from our catalogue and place your first order.'}
                  </p>
                </div>
              ) : (
                orders.map((ord) => {
                  const currentIdx = getStepIndex(ord.status);
                  const isCancelled = ord.status === 'cancelled';
                  const isDelivered = ord.status === 'delivered';
                  const isOut = ord.status === 'out_for_delivery';

                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-brand-border/80 shadow-soft hover:shadow-elevated transition-all"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              #{ord.orderNumber}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                                isDelivered
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isCancelled
                                  ? 'bg-rose-100 text-rose-800'
                                  : isOut
                                  ? 'bg-amber-100 text-amber-900 animate-pulse'
                                  : 'bg-brand-soft text-brand-dark'
                              }`}
                            >
                              {ord.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-brand-muted mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(ord.createdAt).toLocaleString(isHi ? 'hi-IN' : 'en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-brand-muted block">
                            {isHi ? 'कुल देय राशि' : 'Order Total'}
                          </span>
                          <span className="text-xl font-black text-brand-dark">
                            ₹{ord.finalTotal}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">
                            {ord.paymentMethod} • {ord.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* SECURE DELIVERY PIN CARD (High Priority) */}
                      {!isCancelled && !isDelivered && ord.deliveryPin && (
                        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-brand-charcoal text-white shadow-md relative overflow-hidden">
                          <div className="absolute right-0 top-0 bottom-0 w-32 bg-emerald-500/10 transform skew-x-12 pointer-events-none" />
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                                <KeyRound className="w-4 h-4 text-emerald-400" />
                                <span>{isHi ? 'सुरक्षित 6-अंकों का डिलीवरी पिन' : 'Secure 6-Digit Delivery PIN'}</span>
                              </div>
                              <p className="text-[11px] text-emerald-100/80 mt-0.5">
                                {isHi
                                  ? 'यह पिन केवल डिलीवरी पार्टनर के आपके घर पहुँचने पर ही साझा करें।'
                                  : 'Share this PIN with the delivery partner ONLY when your order arrives.'}
                              </p>
                            </div>
                            
                            {/* PIN Display Badge */}
                            <div className="bg-white text-emerald-950 px-5 py-2.5 rounded-xl font-mono font-black text-2xl tracking-[0.25em] text-center shadow-lg border border-emerald-400/40">
                              {ord.deliveryPin}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Lifecycle Progress Tracker */}
                      {!isCancelled && (
                        <div className="mt-6 pt-2">
                          <div className="relative">
                            {/* Line connecting steps */}
                            <div className="absolute top-4 left-4 right-4 h-1 bg-brand-border -z-0 hidden sm:block">
                              <div
                                className="h-full bg-emerald-600 transition-all duration-500"
                                style={{
                                  width: `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%`,
                                }}
                              />
                            </div>

                            {/* Steps Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 relative z-10">
                              {STATUS_STEPS.map((step, sIdx) => {
                                const isPassed = sIdx <= currentIdx;
                                const isCurrent = sIdx === currentIdx;

                                return (
                                  <div
                                    key={step.key}
                                    className="flex flex-col sm:items-center text-left sm:text-center"
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                        isPassed
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : 'bg-white border-2 border-brand-border text-brand-muted'
                                      } ${isCurrent ? 'ring-4 ring-emerald-100 scale-105' : ''}`}
                                    >
                                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : sIdx + 1}
                                    </div>
                                    <span
                                      className={`text-[11px] mt-1.5 font-bold leading-tight ${
                                        isCurrent
                                          ? 'text-emerald-900 font-extrabold'
                                          : isPassed
                                          ? 'text-brand-charcoal'
                                          : 'text-brand-muted'
                                      }`}
                                    >
                                      {isHi ? step.labelHi : step.labelEn}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delivery Partner Status Notice */}
                      {ord.deliveryPartner && !isCancelled && (
                        <div className="mt-4 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-emerald-950">
                            <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>
                              <strong>{isHi ? 'डिलीवरी पार्टनर:' : 'Delivery Partner:'}</strong>{' '}
                              {ord.deliveryPartner.name} ({ord.deliveryPartner.vehicleType || 'Bike'})
                            </span>
                          </div>
                          {ord.deliveryPartner.phone && (
                            <a
                              href={`tel:${ord.deliveryPartner.phone}`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-800"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{isHi ? 'कॉल करें' : 'Call'}</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Items and Address Summary */}
                      <div className="mt-4 pt-4 border-t border-brand-border/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-extrabold text-brand-dark block mb-1">
                            {isHi ? 'सब्ज़ियों की सूची' : 'Items'} ({ord.items.length})
                          </span>
                          <ul className="space-y-1 text-brand-charcoal font-medium">
                            {ord.items.map((it) => (
                              <li key={it.id} className="flex justify-between">
                                <span>
                                  {isHi ? it.productNameHi : it.productNameEn} × {it.quantity} {it.unit}
                                </span>
                                <span className="font-bold">₹{it.lineTotal}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <span className="font-extrabold text-brand-dark block mb-1">
                            {isHi ? 'डिलीवरी पता' : 'Delivery Address'}
                          </span>
                          <p className="text-brand-muted leading-relaxed">
                            {ord.address} {ord.landmark ? `(लैंडमार्क: ${ord.landmark})` : ''}
                          </p>
                          <p className="text-[11px] text-emerald-800 font-bold mt-1">
                            {isHi ? 'स्लॉट:' : 'Slot:'} {ord.deliverySlot}
                          </p>
                          {ord.instructions && (
                            <p className="text-[11px] text-brand-muted italic mt-0.5">
                              "{ord.instructions}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Cancellation Action (Allowed only when pending or confirmed) */}
                      {(ord.status === 'pending' || ord.status === 'confirmed') && (
                        <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between">
                          <span className="text-[11px] text-brand-muted">
                            {isHi ? 'ऑर्डर तैयारी से पूर्व रद्द किया जा सकता है' : 'Order can be cancelled prior to dispatch'}
                          </span>
                          {cancellingOrderId === ord.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={isHi ? 'रद्द करने का कारण...' : 'Reason...'}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="px-2.5 py-1 text-xs border border-brand-border rounded-lg"
                              />
                              <button
                                onClick={() => handleConfirmCancel(ord.id)}
                                className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                              >
                                {isHi ? 'पुष्टि करें' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setCancellingOrderId(null)}
                                className="px-2 py-1 text-brand-muted hover:text-brand-charcoal text-xs"
                              >
                                {isHi ? 'रद्द' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCancellingOrderId(ord.id)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                            >
                              {isHi ? 'ऑर्डर रद्द करें' : 'Cancel Order'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: SAVED ADDRESSES */}
          {activePortalTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="font-extrabold text-base text-brand-dark">
                    {isHi ? 'सहेजे गए डिलीवरी पते' : 'Saved Addresses'}
                  </h3>
                  <p className="text-xs text-brand-muted">
                    {isHi
                      ? 'चेकआउट के समय बार-बार पता भरने की आवश्यकता नहीं होगी।'
                      : 'Saved addresses will automatically autofill at checkout.'}
                  </p>
                </div>
                <button
                  onClick={handleOpenNewAddress}
                  className="px-3.5 py-2 rounded-xl bg-brand-dark hover:bg-brand-hover text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isHi ? 'नया पता जोड़ें' : 'Add Address'}</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-brand-border">
                  <MapPin className="w-10 h-10 text-emerald-700/40 mx-auto mb-2" />
                  <p className="text-xs font-bold text-brand-charcoal">
                    {isHi ? 'कोई सहेजा हुआ पता नहीं है' : 'No saved addresses yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="bg-white rounded-2xl p-4 border border-brand-border shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-brand-soft text-brand-dark text-xs font-black uppercase">
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                              {isHi ? 'डिफ़ॉल्ट पता' : 'Default'}
                            </span>
                          )}
                        </div>
                        <p className="font-extrabold text-sm text-brand-dark">
                          {addr.flatNumber}
                        </p>
                        <p className="text-xs text-brand-charcoal/80 mt-0.5">
                          {addr.street}, {addr.locality}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        {addr.landmark && (
                          <p className="text-[11px] text-emerald-700 mt-1">
                            📌 {isHi ? 'लैंडमार्क:' : 'Landmark:'} {addr.landmark}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-brand-border/60">
                        <button
                          onClick={() => handleOpenEditAddress(addr)}
                          className="p-1.5 rounded-lg text-brand-charcoal hover:bg-brand-soft"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE EDIT */}
          {activePortalTab === 'profile' && (
            <div className="max-w-md bg-white p-6 rounded-3xl border border-brand-border shadow-soft">
              <h3 className="font-extrabold text-base text-brand-dark mb-4">
                {isHi ? 'व्यक्तिगत जानकारी' : 'Personal Details'}
              </h3>

              {profileMsg && (
                <div
                  className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                    profileMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">
                    {isHi ? 'पूरा नाम' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">
                    {isHi ? 'पंजीकृत मोबाइल नंबर (अपरिवर्तनीय)' : 'Registered Mobile (Cannot change)'}
                  </label>
                  <input
                    type="text"
                    value={`+91 ${customerUser.phone}`}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-light text-sm font-mono text-brand-muted cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">
                    {isHi ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-2.5 rounded-xl bg-brand-dark hover:bg-brand-hover text-white text-xs font-extrabold transition-all shadow-xs"
                >
                  {isSavingProfile
                    ? (isHi ? 'सहेजा जा रहा है...' : 'Saving...')
                    : (isHi ? 'परिवर्तन सहेजें' : 'Save Changes')}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Nested Add / Edit Address Modal */}
        {isAddressFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-brand-border animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <h4 className="font-extrabold text-base text-brand-dark">
                  {editingAddress
                    ? (isHi ? 'पता संपादित करें' : 'Edit Address')
                    : (isHi ? 'नया पता जोड़ें' : 'Add New Address')}
                </h4>
                <button
                  onClick={() => setIsAddressFormOpen(false)}
                  className="p-1 rounded-lg text-brand-muted hover:text-brand-charcoal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAddress} className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block font-bold text-brand-dark mb-1">
                    {isHi ? 'पते का लेबल (Home, Work)' : 'Address Label'}
                  </label>
                  <div className="flex gap-2">
                    {['Home', 'Work', 'Other'].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setAddressForm((p) => ({ ...p, label: lbl }))}
                        className={`flex-1 py-1.5 rounded-lg font-bold border ${
                          addressForm.label === lbl
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-brand-light text-brand-charcoal border-brand-border'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-brand-dark mb-1">
                    {isHi ? 'टावर व फ्लैट नंबर' : 'Tower & Flat / House No'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isHi ? 'उदा. Tower 2, Flat 504' : 'e.g. Tower 2, Flat 504'}
                    value={addressForm.flatNumber}
                    onChange={(e) => setAddressForm((p) => ({ ...p, flatNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-dark mb-1">
                    {isHi ? 'सोसाइटी / सड़क का नाम' : 'Street / Society Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isHi ? 'उदा. शेरवानी लेगेसी, धूमनगंज' : 'e.g. Shervani Legacy, Dhoomanganj'}
                    value={addressForm.street}
                    onChange={(e) => setAddressForm((p) => ({ ...p, street: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-brand-dark mb-1">
                      {isHi ? 'शहर' : 'City'}
                    </label>
                    <input
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-brand-dark mb-1">
                      {isHi ? 'पिन कोड' : 'Pincode'}
                    </label>
                    <input
                      type="text"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm((p) => ({ ...p, pincode: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-brand-dark mb-1">
                    {isHi ? 'लैंडमार्क (वैकल्पिक)' : 'Landmark (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isHi ? 'उदा. क्लब हाउस के पास' : 'e.g. Near Clubhouse'}
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm((p) => ({ ...p, landmark: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-brand-border text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm((p) => ({ ...p, isDefault: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-brand-charcoal">
                    {isHi ? 'डिफ़ॉल्ट पता बनाएं' : 'Set as default address'}
                  </span>
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-brand-dark text-white font-extrabold hover:bg-brand-hover"
                  >
                    {isHi ? 'सहेजें' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddressFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-charcoal font-bold"
                  >
                    {isHi ? 'रद्द' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
