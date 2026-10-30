import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  UserCheck,
  UserX,
  Plus,
  RefreshCw,
  Phone,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Search,
  Key,
  Copy,
  Check,
  Sparkles,
  Eye,
  EyeOff,
  MessageCircle,
  UserMinus,
  History,
} from 'lucide-react';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export const AdminDeliveryManagement = () => {
  const { isHindi } = useLanguage();
  const [subTab, setSubTab] = useState('assignment'); // 'assignment', 'partners', 'audit'
  const [partners, setPartners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [orderAssignmentFilter, setOrderAssignmentFilter] = useState('all'); // 'all', 'unassigned', 'assigned'

  // New Partner Modal
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
  });

  // Assign Partner Modal
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Password Reset & Generation Modal State
  const [resetPartner, setResetPartner] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Audit Log State
  const [auditOrderNumber, setAuditOrderNumber] = useState('');
  const [auditData, setAuditData] = useState(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const showMsg = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Load partners
  const loadPartners = useCallback(async () => {
    try {
      const res = await api.getDeliveryPartners();
      if (res.success && res.partners) {
        setPartners(res.partners);
      }
    } catch (err) {
      console.error('Failed to load delivery partners:', err);
    }
  }, []);

  // Load unassigned & active orders
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminOrders('?limit=100');
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load orders for assignment:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
    loadOrders();
  }, [loadPartners, loadOrders]);

  // Create delivery partner
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    try {
      await api.createDeliveryPartner(partnerForm);
      showMsg(isHindi ? 'नया डिलीवरी पार्टनर सफलतापूर्वक बनाया गया' : 'Delivery partner created successfully');
      setIsAddPartnerOpen(false);
      setPartnerForm({
        name: '',
        phone: '',
        email: '',
        password: '',
        vehicleType: 'Bike',
        vehicleNumber: '',
      });
      loadPartners();
    } catch (err) {
      showMsg(err.message || (isHindi ? 'पार्टनर बनाने में त्रुटि' : 'Failed to create partner'), 'error');
    }
  };

  // Toggle partner active/inactive
  const handleTogglePartner = async (partner) => {
    const nextStatus = !partner.isActive;
    const confirmMsg = nextStatus
      ? (isHindi ? `क्या आप ${partner.name} का खाता सक्रिय करना चाहते हैं?` : `Are you sure you want to activate ${partner.name}'s account?`)
      : (isHindi ? `क्या आप ${partner.name} का खाता निष्क्रिय करना चाहते हैं?` : `Are you sure you want to deactivate ${partner.name}'s account?`);
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateDeliveryPartner(partner.id, { isActive: nextStatus });
      showMsg(nextStatus ? (isHindi ? 'पार्टनर सक्रिय किया गया' : 'Partner activated') : (isHindi ? 'पार्टनर निष्क्रिय किया गया' : 'Partner deactivated'));
      loadPartners();
    } catch (err) {
      showMsg(err.message || (isHindi ? 'त्रुटि' : 'Error'), 'error');
    }
  };

  // Assign order to partner
  const handleConfirmAssign = async () => {
    if (!assigningOrder || !selectedPartnerId) return;
    try {
      await api.assignOrderDelivery(assigningOrder.id, selectedPartnerId, assignNotes);
      showMsg(isHindi ? 'ऑर्डर सफलतापूर्वक डिलीवरी पार्टनर को सौंपा गया' : 'Order assigned to delivery partner successfully');
      setAssigningOrder(null);
      setSelectedPartnerId('');
      setAssignNotes('');
      loadOrders();
      loadPartners();
    } catch (err) {
      showMsg(err.message || (isHindi ? 'असाइनमेंट विफल' : 'Assignment failed'), 'error');
    }
  };

  // Remove / Unassign delivery partner from order
  const handleRemoveAssignment = async (orderToUnassign) => {
    const target = orderToUnassign || assigningOrder;
    if (!target) return;
    const partnerName = target.deliveryPartner?.name || (isHindi ? 'डिलीवरी पार्टनर' : 'delivery partner');
    const confirmMsg = isHindi
      ? `क्या आप ऑर्डर #${target.orderNumber} से ${partnerName} को हटाना (Unassign) चाहते हैं?`
      : `Are you sure you want to unassign ${partnerName} from Order #${target.orderNumber}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.removeOrderDeliveryPartner(target.id, 'Admin unassigned delivery partner from dashboard');
      showMsg(isHindi ? `ऑर्डर #${target.orderNumber} से डिलीवरी पार्टनर हटा दिया गया` : `Delivery partner unassigned from Order #${target.orderNumber}`);
      setAssigningOrder(null);
      setSelectedPartnerId('');
      setAssignNotes('');
      loadOrders();
      loadPartners();
    } catch (err) {
      showMsg(err.message || (isHindi ? 'पार्टनर हटाने में त्रुटि' : 'Error unassigning partner'), 'error');
    }
  };

  // Fetch delivery verification audit for single order
  const handleSearchAudit = async (orderIdOrNumber) => {
    const target = orderIdOrNumber || auditOrderNumber;
    if (!target) return;
    setIsLoadingAudit(true);
    setAuditData(null);
    try {
      const res = await api.getOrderDeliveryAudit(target.trim());
      if (res.success && res.data) {
        setAuditData(res.data);
      }
    } catch (err) {
      showMsg(err.message || (isHindi ? 'ऑडिट इतिहास नहीं मिला' : 'No audit history found for this order'), 'error');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Generate random memorable password (e.g. KIR-849201)
  const generateRandomPassword = () => {
    const digits = Math.floor(100000 + Math.random() * 900000);
    const pass = `KIR-${digits}`;
    setNewPasswordInput(pass);
    return pass;
  };

  const handleOpenResetModal = (partner) => {
    setResetPartner(partner);
    setResetSuccessData(null);
    setCopied(false);
    setShowPassword(false);
    const digits = Math.floor(100000 + Math.random() * 900000);
    setNewPasswordInput(`KIR-${digits}`);
  };

  const handleConfirmResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!resetPartner) return;
    setIsResettingPassword(true);
    try {
      const res = await api.resetDeliveryPartnerPassword(resetPartner.id, newPasswordInput);
      if (res.success) {
        showMsg(res.message || (isHindi ? 'पासवर्ड सफलतापूर्वक रीसेट किया गया' : 'Password reset successfully'));
        setResetSuccessData({
          partner: res.partner || resetPartner,
          password: res.newPassword || newPasswordInput,
        });
        loadPartners();
      }
    } catch (err) {
      showMsg(err.message || (isHindi ? 'पासवर्ड रीसेट करने में त्रुटि' : 'Error resetting password'), 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    if (!resetSuccessData?.password) return;
    navigator.clipboard.writeText(resetSuccessData.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppShareUrl = () => {
    if (!resetSuccessData) return '#';
    const phone = (resetSuccessData.partner.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
    const text = encodeURIComponent(
      `नमस्ते ${resetSuccessData.partner.name},\n\nKIRSAB डिलीवरी पार्टनर पोर्टल का आपका नया पासवर्ड रीसेट कर दिया गया है:\n🔑 नया पासवर्ड: *${resetSuccessData.password}*\n📱 मोबाइल नंबर: *${resetSuccessData.partner.phone}*\n\nपोर्टल लिंक: ${portalUrl}\n(कृपया इसे सुरक्षित रखें)`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Metrics
  const activePartnersCount = partners.filter((p) => p.isActive).length;
  const unassignedOrders = orders.filter(
    (o) => !o.deliveryPartnerId && o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const activeAssignedOrders = orders.filter(
    (o) => o.deliveryPartnerId && o.status !== 'delivered' && o.status !== 'cancelled'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">{isHindi ? 'कुल पार्टनर्स' : 'Total Partners'}</span>
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{partners.length}</p>
          <span className="text-[11px] text-emerald-700 font-semibold">{activePartnersCount} {isHindi ? 'सक्रिय (Active)' : 'Active'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">{isHindi ? 'अनावंटित ऑर्डर्स' : 'Unassigned Orders'}</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{unassignedOrders.length}</p>
          <span className="text-[11px] text-amber-700 font-semibold">{isHindi ? 'असाइनमेंट प्रतीक्षित' : 'Awaiting Assignment'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-indigo-800">
            <span className="text-xs font-bold uppercase tracking-wider">{isHindi ? 'मार्ग में (Active Delivery)' : 'Out for Delivery'}</span>
            <Truck className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeAssignedOrders.length}</p>
          <span className="text-[11px] text-indigo-700 font-semibold">{isHindi ? 'पार्टनर्स को सौंपे गए' : 'Assigned to Partners'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">{isHindi ? 'पिन सत्यापन प्रणाली' : 'PIN Security'}</span>
            <KeyRound className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm font-black text-slate-900 mt-2">{isHindi ? '100% सुरक्षित (HMAC)' : '100% Secure (HMAC)'}</p>
          <span className="text-[11px] text-slate-500 font-semibold">{isHindi ? 'शून्य लीक नीति' : 'Zero-Leak Architecture'}</span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Sub-Tab Navigation & Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => setSubTab('assignment')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              subTab === 'assignment'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isHindi ? `ऑर्डर असाइनमेंट (${unassignedOrders.length} अनावंटित)` : `Order Assignment (${unassignedOrders.length} Unassigned)`}
          </button>
          <button
            onClick={() => setSubTab('partners')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              subTab === 'partners'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isHindi ? `डिलीवरी पार्टनर्स (${partners.length})` : `Delivery Partners (${partners.length})`}
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              subTab === 'audit'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isHindi ? 'सत्यापन व ऑडिट इतिहास' : 'Verification & Audit History'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'partners' && (
            <button
              onClick={() => setIsAddPartnerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isHindi ? 'नया पार्टनर जोड़ें' : 'Add Delivery Partner'}</span>
            </button>
          )}
          <button
            onClick={() => {
              loadPartners();
              loadOrders();
            }}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ORDER ASSIGNMENT */}
      {subTab === 'assignment' && (() => {
        const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
        const unassignedOrdersCount = activeOrders.filter((o) => !o.deliveryPartner).length;
        const assignedOrdersCount = activeOrders.filter((o) => Boolean(o.deliveryPartner)).length;

        const displayedOrders = activeOrders.filter((o) => {
          if (orderAssignmentFilter === 'unassigned') return !o.deliveryPartner;
          if (orderAssignmentFilter === 'assigned') return Boolean(o.deliveryPartner);
          return true;
        });

        return (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isHindi ? 'सक्रिय ऑर्डर्स एवं डिलीवरी पार्टनर आवंटन' : 'Active Orders & Delivery Partner Assignment'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isHindi ? 'ऑर्डर्स को अधिकृत डिलीवरी पार्टनर को सौंपें ताकि वे पिन सत्यापन के साथ डिलीवरी कर सकें।' : 'Assign incoming orders to authorized delivery partners for secure PIN-verified delivery.'}
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
                  <button
                    onClick={() => setOrderAssignmentFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      orderAssignmentFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isHindi ? `सभी (${activeOrders.length})` : `All (${activeOrders.length})`}
                  </button>
                  <button
                    onClick={() => setOrderAssignmentFilter('unassigned')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      orderAssignmentFilter === 'unassigned'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-amber-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <span>{isHindi ? 'बिना पार्टनर' : 'Unassigned'}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white font-mono">
                      {unassignedOrdersCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setOrderAssignmentFilter('assigned')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      orderAssignmentFilter === 'assigned'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-emerald-800 hover:bg-emerald-100/50'
                    }`}
                  >
                    <span>{isHindi ? 'असाइन किए गए' : 'Assigned'}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-800 text-white font-mono">
                      {assignedOrdersCount}
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5 pl-5">{isHindi ? 'ऑर्डर संदर्भ' : 'Order Ref'}</th>
                      <th className="p-3.5">{isHindi ? 'ग्राहक व संपर्क' : 'Customer & Contact'}</th>
                      <th className="p-3.5">{isHindi ? 'डिलीवरी पता' : 'Delivery Address'}</th>
                      <th className="p-3.5">{isHindi ? 'स्थिति' : 'Status'}</th>
                      <th className="p-3.5">{isHindi ? 'वर्तमान पार्टनर' : 'Assigned Partner'}</th>
                      <th className="p-3.5 text-right pr-5">{isHindi ? 'कार्रवाई' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          {isHindi ? 'कोई ऑर्डर नहीं मिला' : 'No active orders found'}
                        </td>
                      </tr>
                    ) : (
                      displayedOrders.map((ord) => {
                        const isAssigned = Boolean(ord.deliveryPartner);

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 pl-5">
                              <span className="font-mono font-black text-emerald-900 block">
                                #{ord.orderNumber}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(ord.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <span className="font-extrabold text-slate-900 block">
                                {ord.customerName}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                +91 {ord.customerPhone}
                              </span>
                            </td>

                            <td className="p-3.5 max-w-xs">
                              <p className="truncate text-slate-800">{ord.address}</p>
                              <span className="text-[10px] text-emerald-800 font-bold block">
                                {isHindi ? 'स्लॉट: ' : 'Slot: '}{ord.deliverySlot}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-800">
                                {ord.status.replace(/_/g, ' ')}
                              </span>
                            </td>

                            <td className="p-3.5">
                              {isAssigned ? (
                                <div>
                                  <span className="font-extrabold text-emerald-900 block">
                                    {ord.deliveryPartner.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono block">
                                    +91 {ord.deliveryPartner.phone}
                                  </span>
                                  {ord.assignedAt && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                                      {new Date(ord.assignedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200">
                                  {isHindi ? 'पार्टनर प्रतीक्षित' : 'Awaiting Partner'}
                                </span>
                              )}
                            </td>

                            <td className="p-3.5 text-right pr-5">
                              {isAssigned ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setAssigningOrder(ord);
                                      setSelectedPartnerId(ord.deliveryPartnerId || '');
                                      setAssignNotes('');
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all bg-slate-100 hover:bg-slate-200 text-slate-800"
                                    title={isHindi ? 'पार्टनर बदलें (Reassign)' : 'Reassign Delivery Partner'}
                                  >
                                    {isHindi ? 'पुनः असाइन' : 'Reassign'}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveAssignment(ord)}
                                    className="p-1.5 rounded-xl text-xs font-extrabold transition-all bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                    title={isHindi ? 'पार्टनर हटाएं (Remove assignment)' : 'Unassign Delivery Partner'}
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAuditOrderNumber(ord.orderNumber);
                                      handleSearchAudit(ord.orderNumber);
                                      setSubTab('audit');
                                    }}
                                    className="p-1.5 rounded-xl text-xs font-extrabold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    title={isHindi ? 'असाइनमेंट इतिहास देखें (View History)' : 'View Audit History'}
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAssigningOrder(ord);
                                    setSelectedPartnerId(ord.deliveryPartnerId || '');
                                    setAssignNotes('');
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs"
                                >
                                  {isHindi ? 'पार्टनर चुनें' : 'Assign Partner'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB 2: PARTNERS LIST & ACTIONS */}
      {subTab === 'partners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                p.isActive ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{p.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500">+91 {p.phone}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      p.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {p.isActive ? (isHindi ? 'सक्रिय' : 'Active') : (isHindi ? 'निलंबित' : 'Inactive')}
                  </span>
                </div>

                <div className="py-3 space-y-1.5 text-xs text-slate-600">
                  <p>
                    {isHindi ? 'वाहन: ' : 'Vehicle: '}
                    <strong>
                      {p.vehicleType || 'Bike'} {p.vehicleNumber ? `(${p.vehicleNumber})` : ''}
                    </strong>
                  </p>
                  <p>
                    {isHindi ? 'सक्रिय आवंटित ऑर्डर्स: ' : 'Active Assigned Orders: '}
                    <strong className="text-indigo-800">{p.activeOrdersCount || 0}</strong>
                  </p>
                  <p>
                    {isHindi ? 'सफलतापूर्वक डिलीवर किए गए: ' : 'Completed Deliveries: '}
                    <strong className="text-emerald-800">{p.completedOrdersCount || 0}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                <a
                  href={`tel:${p.phone}`}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'कॉल' : 'Call'}</span>
                </a>

                <button
                  onClick={() => handleOpenResetModal(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-xs flex items-center gap-1 transition-all"
                  title={isHindi ? 'पासवर्ड रीसेट या नया पासवर्ड बनाएं' : 'Reset or auto-generate password'}
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isHindi ? 'पासवर्ड रीसेट' : 'Reset Password'}</span>
                </button>

                <button
                  onClick={() => handleTogglePartner(p)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    p.isActive
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {p.isActive ? (isHindi ? 'खाता निष्क्रिय करें' : 'Deactivate') : (isHindi ? 'सक्रिय करें' : 'Activate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: VERIFICATION AUDIT TRAIL */}
      {subTab === 'audit' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isHindi ? 'डिलीवरी पिन सत्यापन एवं ऑडिट लॉग' : 'Delivery PIN Verification & Security Audit'}
              </h3>
              <p className="text-xs text-slate-500">
                {isHindi ? 'प्रत्येक ऑर्डर के पिन सत्यापन प्रयासों, असफल प्रयासों और टाइमस्टैम्प की जांच करें (कस्टमर का गोपनीय पिन कभी नहीं दिखाया जाता)।' : 'Inspect PIN verification attempts, fail logs, and tamper-proof delivery timestamps.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isHindi ? 'ऑर्डर नंबर (उदा. KIR-2026-1001)' : 'Order Number (e.g. KIR-2026-1001)'}
                value={auditOrderNumber}
                onChange={(e) => setAuditOrderNumber(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSearchAudit()}
                disabled={isLoadingAudit}
                className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-extrabold hover:bg-emerald-900 shadow-2xs"
              >
                {isLoadingAudit ? (isHindi ? 'लोड हो रहा...' : 'Searching...') : (isHindi ? 'ऑडिट देखें' : 'Search Audit')}
              </button>
            </div>
          </div>

          {auditData && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="font-mono font-black text-sm text-emerald-900">
                    #{auditData.orderNumber}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isHindi ? 'ग्राहक: ' : 'Customer: '}
                    <strong>{auditData.customerName}</strong> • {isHindi ? 'वर्तमान स्थिति: ' : 'Status: '}
                    <strong>{auditData.status}</strong>
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400 block font-bold">{isHindi ? 'गलत पिन प्रयास संख्या' : 'Failed PIN Attempts'}</span>
                  <span
                    className={`font-black text-sm ${
                      auditData.pinFailedAttempts > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {auditData.pinFailedAttempts} {isHindi ? 'प्रयास' : 'attempts'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 mb-2">
                  {isHindi ? 'सत्यापन ऑडिट घटनाक्रम (Verification Events)' : 'Verification Audit Events'}
                </h4>
                {auditData.verificationAudits?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {isHindi ? 'इस ऑर्डर पर अभी तक कोई पिन सत्यापन प्रयास दर्ज नहीं हुआ है।' : 'No audit records logged for this order yet.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditData.verificationAudits.map((ev) => (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                          ev.success
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {ev.success ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                          <div>
                            <span className="font-black uppercase tracking-wider text-[11px] block">
                              {ev.actionType}
                            </span>
                            <span className="text-[11px] opacity-80">{ev.notes}</span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] opacity-75 font-mono">
                          {new Date(ev.createdAt).toLocaleString(isHindi ? 'hi-IN' : 'en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Delivery Partner */}
      {isAddPartnerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">
                {isHindi ? 'नया डिलीवरी पार्टनर बनाएं' : 'Register New Delivery Partner'}
              </h3>
              <button
                onClick={() => setIsAddPartnerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'पूरा नाम *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  placeholder={isHindi ? 'उदा. अमित कुमार' : 'e.g. Amit Kumar'}
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'मोबाइल नंबर (10 अंक) *' : 'Phone Number (10 digits) *'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full pl-12 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'ईमेल (वैकल्पिक)' : 'Email (Optional)'}</label>
                <input
                  type="email"
                  placeholder="partner@kirsab.in"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'लॉगिन पासवर्ड *' : 'Login Password *'}</label>
                <input
                  type="password"
                  required
                  placeholder={isHindi ? 'कम से कम 6 अक्षर' : 'At least 6 characters'}
                  value={partnerForm.password}
                  onChange={(e) => setPartnerForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'वाहन प्रकार' : 'Vehicle Type'}</label>
                  <select
                    value={partnerForm.vehicleType}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, vehicleType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="Bike">{isHindi ? 'मोटरसाइकिल (Bike)' : 'Motorcycle (Bike)'}</option>
                    <option value="Scooter">{isHindi ? 'स्कूटर (Scooter)' : 'Scooter'}</option>
                    <option value="Bicycle">{isHindi ? 'साइकिल (Bicycle)' : 'Bicycle'}</option>
                    <option value="Electric Bike">{isHindi ? 'ई-बाइक (E-Bike)' : 'Electric Bike'}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isHindi ? 'वाहन नंबर (वैकल्पिक)' : 'Vehicle Number (Optional)'}</label>
                  <input
                    type="text"
                    placeholder="UP 70 AB 1234"
                    value={partnerForm.vehicleNumber}
                    onChange={(e) => setPartnerForm((p) => ({ ...p, vehicleNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-800 text-white font-extrabold text-xs hover:bg-emerald-900"
                >
                  {isHindi ? 'पार्टनर बनाएं' : 'Register Partner'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold"
                >
                  {isHindi ? 'रद्द' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Order to Partner */}
      {assigningOrder && (() => {
        const currentlyAssigned = assigningOrder.deliveryPartner;
        const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {currentlyAssigned
                      ? (isHindi ? 'डिलीवरी पार्टनर बदलें (Reassign)' : 'Reassign Delivery Partner')
                      : (isHindi ? 'डिलीवरी पार्टनर असाइन करें' : 'Assign Delivery Partner')}
                  </h3>
                  <span className="font-mono text-xs text-emerald-800 font-bold">
                    #{assigningOrder.orderNumber}
                  </span>
                </div>
                <button
                  onClick={() => setAssigningOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Info */}
              <div className="my-3 p-3 rounded-2xl bg-slate-50 text-xs space-y-1">
                <p>{isHindi ? 'ग्राहक: ' : 'Customer: '}<strong>{assigningOrder.customerName}</strong> (+91 {assigningOrder.customerPhone})</p>
                <p>{isHindi ? 'पता: ' : 'Address: '}<strong>{assigningOrder.address}</strong></p>
                <p>{isHindi ? 'स्लॉट: ' : 'Slot: '}<strong>{assigningOrder.deliverySlot}</strong></p>
              </div>

              {/* Currently Assigned Partner Card if any */}
              {currentlyAssigned && (
                <div className="mb-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      {isHindi ? 'वर्तमान में असाइन' : 'Currently Assigned'}
                    </span>
                    <p className="font-extrabold text-emerald-950 text-sm">
                      {currentlyAssigned.name}
                    </p>
                    <p className="text-emerald-700 font-mono text-[11px]">
                      +91 {currentlyAssigned.phone}
                    </p>
                    {assigningOrder.assignedAt && (
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        {isHindi ? 'असाइन समय: ' : 'Assigned: '}
                        {new Date(assigningOrder.assignedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(assigningOrder)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-xs flex items-center gap-1 transition-colors"
                    title={isHindi ? 'पार्टनर को हटाएं' : 'Unassign Partner'}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>{isHindi ? 'हटाएं' : 'Remove'}</span>
                  </button>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {currentlyAssigned
                      ? (isHindi ? 'नया पार्टनर चुनें *' : 'Select New Partner *')
                      : (isHindi ? 'डिलीवरी पार्टनर चुनें *' : 'Select Delivery Partner *')}
                  </label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">{isHindi ? '-- पार्टनर चुनें --' : '-- Select Partner --'}</option>
                    {partners
                      .filter((p) => p.isActive)
                      .map((p) => {
                        const count = p.activeOrdersCount || 0;
                        const statusBadge = count === 0
                          ? (isHindi ? '🟢 उपलब्ध (0 सक्रिय)' : '🟢 Available (0 active)')
                          : (isHindi ? `🟡 व्यस्त (${count} सक्रिय)` : `🟡 Busy (${count} active)`);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} (+91 {p.phone}) — {statusBadge}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Selected Partner Availability Card */}
                {selectedPartner && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900 block">{selectedPartner.name}</span>
                      <span className="text-slate-500 font-mono">+91 {selectedPartner.phone}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                          (selectedPartner.activeOrdersCount || 0) === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {(selectedPartner.activeOrdersCount || 0) === 0
                          ? (isHindi ? 'उपलब्ध (Available)' : 'Available')
                          : `${selectedPartner.activeOrdersCount} ${isHindi ? 'सक्रिय ऑर्डर्स' : 'Active Orders'}`}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isHindi ? 'निर्देश / नोट्स (वैकल्पिक)' : 'Special Delivery Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isHindi ? 'उदा. गेट 2 से प्रवेश करें' : 'e.g. Leave at gate 2'}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    disabled={!selectedPartnerId || selectedPartnerId === assigningOrder.deliveryPartnerId}
                    onClick={handleConfirmAssign}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-800 text-white font-extrabold text-xs hover:bg-emerald-900 disabled:opacity-40"
                  >
                    {currentlyAssigned
                      ? (isHindi ? 'पुनः असाइन करें' : 'Confirm Reassignment')
                      : (isHindi ? 'असाइनमेंट पुष्टि करें' : 'Confirm Assignment')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigningOrder(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold"
                  >
                    {isHindi ? 'रद्द' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. RESET / AUTO-GENERATE PARTNER PASSWORD MODAL */}
      {resetPartner && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isHindi ? 'डिलीवरी पार्टनर पासवर्ड रीसेट' : 'Reset / Generate Password'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {resetPartner.name} • +91 {resetPartner.phone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setResetPartner(null);
                  setResetSuccessData(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If password was just reset successfully, show credentials & WhatsApp sharing */}
            {resetSuccessData ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-900">
                    {isHindi ? 'नया पासवर्ड सेट हो गया!' : 'New Password Generated Successfully!'}
                  </h4>
                  <p className="text-xs text-emerald-700">
                    {isHindi ? `डिलीवरी पार्टनर ${resetSuccessData.partner.name} अब इस पासवर्ड से लॉगिन कर सकते हैं।` : `Delivery partner ${resetSuccessData.partner.name} can now log in with these credentials.`}
                  </p>

                  <div className="my-3 p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-xs">
                    <span className="font-mono font-black text-lg text-slate-900 tracking-wider">
                      {resetSuccessData.password}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? (isHindi ? 'कॉपी हुआ!' : 'Copied!') : (isHindi ? 'कॉपी करें' : 'Copy Password')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href={getWhatsAppShareUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isHindi ? 'WhatsApp पर नया पासवर्ड भेजें' : 'Share Password via WhatsApp'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setResetPartner(null);
                      setResetSuccessData(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                  >
                    {isHindi ? 'हो गया (Done)' : 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              /* Password Reset Form */
              <form onSubmit={handleConfirmResetPassword} className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      {isHindi ? 'नया पासवर्ड दर्ज करें या ऑटो-जनरेट करें *' : 'Enter New Password or Auto-Generate *'}
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 underline underline-offset-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isHindi ? 'ऑटो-जनरेट करें' : 'Auto-Generate'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder={isHindi ? 'कम से कम 6 अक्षर (उदा. KIR-748291)' : 'At least 6 chars (e.g. KIR-748291)'}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-emerald-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {isHindi ? "'ऑटो-जनरेट' दबाकर नया कोड बना सकते हैं या अपनी पसंद का पासवर्ड टाइप करें।" : "Click 'Auto-Generate' to generate a secure memorable password or type a custom one."}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isResettingPassword || !newPasswordInput || newPasswordInput.length < 6}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isResettingPassword ? (isHindi ? 'अपडेट हो रहा है...' : 'Updating...') : (isHindi ? 'पासवर्ड रीसेट व सुरक्षित करें' : 'Confirm Password Reset')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetPartner(null);
                      setResetSuccessData(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                  >
                    {isHindi ? 'रद्द' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
