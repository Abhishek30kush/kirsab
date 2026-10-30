import React from 'react';
import {
  Truck,
  Phone,
  MessageCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
} from 'lucide-react';

/**
 * YourDeliveryPartnerCard
 * Professional Delivery Partner card for customer Order Details view.
 * Displays:
 *  - Partner profile photo / avatar
 *  - Full name & registered phone number
 *  - Live delivery assignment status badge
 *  - Assignment date & time
 *  - One-click Call Delivery Partner (tel:)
 *  - One-click WhatsApp Delivery Partner (prefilled customer order message)
 *  - Beautiful waiting/pending state if no partner is assigned yet.
 */
export const YourDeliveryPartnerCard = ({ order, isHi = true }) => {
  if (!order) return null;

  const partner = order.deliveryPartner;
  const isAssigned = Boolean(partner && partner.name);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isOut = order.status === 'out_for_delivery';

  // Do not show for cancelled orders
  if (isCancelled) return null;

  // Format clean phone for WhatsApp
  const rawPhone = partner?.phone ? String(partner.phone).replace(/[^0-9]/g, '') : '';
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  // Prefilled WhatsApp message according to requirements:
  // "Hello, I am a KIRSAB customer. I am contacting you regarding my order #ORDER_NUMBER."
  const whatsappText = isHi
    ? `नमस्ते ${partner?.name || 'डिलीवरी पार्टनर'}, मैं KIRSAB का ग्राहक हूँ। मैं अपने ऑर्डर #${order.orderNumber} के संबंध में संपर्क कर रहा हूँ।`
    : `Hello ${partner?.name || 'Delivery Partner'}, I am a KIRSAB customer. I am contacting you regarding my order #${order.orderNumber}.`;

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;

  // Determine human-readable status badge
  let statusBadge = {
    label: isHi ? 'ऑर्डर सौंपा गया' : 'Assigned',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  if (isDelivered) {
    statusBadge = {
      label: isHi ? 'डिलीवर हो चुका' : 'Delivered',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  } else if (isOut) {
    statusBadge = {
      label: isHi ? 'मार्ग में है (Out for Delivery)' : 'Out for Delivery',
      color: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
    };
  } else if (order.pickedUpAt) {
    statusBadge = {
      label: isHi ? 'पिकअप हो चुका' : 'Picked Up',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
  } else if (order.acceptedAt) {
    statusBadge = {
      label: isHi ? 'स्वीकृत (Accepted)' : 'Accepted',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }

  // Format assignment date & time
  const formattedAssignedTime = order.assignedAt
    ? new Date(order.assignedAt).toLocaleString(isHi ? 'hi-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  // 1. UNASSIGNED STATE: Friendly reassurance card
  if (!isAssigned) {
    // Only show unassigned card if order is active (not delivered)
    if (isDelivered) return null;

    return (
      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-brand-soft/70 border border-brand-border/90 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white border border-brand-border flex items-center justify-center shrink-0 shadow-2xs text-emerald-700">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-extrabold text-sm text-brand-dark flex items-center gap-1.5">
                <span>{isHi ? 'आपका डिलीवरी पार्टनर' : 'Your Delivery Partner'}</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                {isHi ? 'जल्द ही असाइन होगा' : 'Assigning Soon'}
              </span>
            </div>

            <p className="text-xs text-brand-charcoal font-semibold mt-1">
              {isHi
                ? 'डिलीवरी पार्टनर जल्द ही असाइन किया जाएगा (Delivery partner will be assigned soon)'
                : 'Delivery partner will be assigned soon.'}
            </p>
            <p className="text-[11px] text-brand-muted mt-0.5">
              {isHi
                ? 'हमारा स्टोर आपके ताज़ा सामान को पैक कर रहा है। जैसे ही पार्टनर रवाना होंगे, उनका नाम, मोबाइल नंबर और कॉल/व्हाट्सएप बटन यहाँ तुरंत दिखाई देगा।'
                : 'Our store is freshly packing your order. As soon as a delivery partner is dispatched, their name and direct contact buttons will appear here.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ASSIGNED STATE: Professional Contact Card
  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-soft hover:shadow-elevated transition-all">
      
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-700" />
          <h4 className="font-black text-sm text-slate-900 tracking-tight">
            {isHi ? 'आपका डिलीवरी पार्टनर' : 'Your Delivery Partner'}
          </h4>
        </div>

        {/* Live Status Badge */}
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadge.color}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Partner Profile Information */}
      <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {/* Avatar with initial & vehicle badge */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 text-white font-black text-base flex items-center justify-center shadow-md">
              {partner.name ? partner.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-emerald-300 text-emerald-700 flex items-center justify-center shadow-2xs text-[10px]"
              title={partner.vehicleType || 'Bike'}
            >
              <Truck className="w-3 h-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-slate-900">
                {partner.name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{isHi ? 'सत्यापित पार्टनर' : 'Verified'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-600 font-mono mt-0.5">
              +91 {partner.phone}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span>वाहन: <strong>{partner.vehicleType || 'Bike'}</strong></span>
              {partner.vehicleNumber && <span>• <strong>{partner.vehicleNumber}</strong></span>}
              {formattedAssignedTime && (
                <span>• {isHi ? 'असाइन समय:' : 'Assigned:'} <strong>{formattedAssignedTime}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: 1. Call Delivery Partner, 2. WhatsApp Delivery Partner */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Call Button */}
        <a
          href={`tel:${partner.phone}`}
          className="py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2 group active:scale-98"
        >
          <Phone className="w-4 h-4 text-emerald-300 group-hover:rotate-12 transition-transform" />
          <span>{isHi ? 'डिलीवरी पार्टनर को कॉल करें' : 'Call Delivery Partner'}</span>
        </a>

        {/* WhatsApp Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2 group active:scale-98"
        >
          <MessageCircle className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          <span>{isHi ? 'व्हाट्सएप पर संपर्क करें' : 'WhatsApp Delivery Partner'}</span>
        </a>
      </div>

    </div>
  );
};
