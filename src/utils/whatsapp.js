import { STORE_CONFIG, isWhatsAppConfigured } from '../config/store';

/**
 * Builds a neatly formatted WhatsApp order message string
 * @param {object} params
 * @param {object} params.customer Customer details { fullName, phone, address, landmark, deliverySlot, instructions }
 * @param {Array} params.items Enriched cart items
 * @param {object} params.totals Calculated order totals { subtotal, deliveryFee, finalTotal }
 * @returns {string} Formatted plain text message for WhatsApp
 */
export const buildWhatsAppMessage = ({ customer, items, totals }) => {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const slotInfo = STORE_CONFIG.deliverySlots.find(s => s.id === customer.deliverySlot);
  const slotText = slotInfo ? `${slotInfo.label} (${slotInfo.time})` : customer.deliverySlot;

  let message = `🛒 *नया ऑर्डर — ${STORE_CONFIG.brandName} (${STORE_CONFIG.brandNameHindi})*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📅 दिनांक (Date): ${dateStr}\n\n`;

  message += `👤 *ग्राहक विवरण (Customer Details):*\n`;
  message += `• नाम: ${customer.fullName.trim()}\n`;
  message += `• मोबाइल: +91 ${customer.phone.trim()}\n`;
  message += `• पता: ${customer.address.trim()}\n`;
  if (customer.landmark && customer.landmark.trim()) {
    message += `• लैंडमार्क: ${customer.landmark.trim()}\n`;
  }
  message += `• स्थान: ${STORE_CONFIG.serviceArea.primary}, ${STORE_CONFIG.serviceArea.city}\n`;
  message += `• डिलीवरी स्लॉट: ${slotText}\n\n`;

  message += `🥬 *ऑर्डर की गई सब्ज़ियाँ (Order Items):*\n`;
  items.forEach((item, index) => {
    const p = item.product;
    message += `${index + 1}. *${p.nameHi}* (${p.nameEn})\n`;
    message += `   मात्रा: ${item.quantity} × ${p.unit} @ ₹${item.unitPrice} = *₹${item.lineTotal}*\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📦 सब्ज़ी योग (Subtotal): ₹${totals.subtotal}\n`;
  if (totals.deliveryFee === 0) {
    message += `🚚 डिलीवरी शुल्क (Delivery Fee): *मुफ़्त (FREE)*\n`;
  } else {
    message += `🚚 डिलीवरी शुल्क (Delivery Fee): ₹${totals.deliveryFee}\n`;
  }
  message += `💰 *कुल देय राशि (Grand Total): ₹${totals.finalTotal}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (customer.instructions && customer.instructions.trim()) {
    message += `📝 *विशेष निर्देश (Instructions):*\n"${customer.instructions.trim()}"\n\n`;
  }

  message += `📌 *नोट (Note for Seller):*\n`;
  message += `कृपया ताज़ा सब्ज़ियों की उपलब्धता की पुष्टि करके डिलीवरी समय सूचित करें। धन्यवाद!\n`;
  message += `_${STORE_CONFIG.tagline}_`;

  return message;
};

/**
 * Generates official WhatsApp click-to-chat URL
 * @param {string} text Message text
 * @param {string} number Optional override phone number
 * @returns {string|null} Full wa.me URL or null if number unconfigured
 */
export const createWhatsAppOrderUrl = (text, number = STORE_CONFIG.whatsappNumber) => {
  if (!isWhatsAppConfigured(number)) {
    return null;
  }
  // Sanitize number to remove non-numeric chars
  const cleanNumber = number.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
};
