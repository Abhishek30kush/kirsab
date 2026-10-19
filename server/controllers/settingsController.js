import { prisma } from '../config/db.js';

/**
 * Helper to ensure a default settings record always exists
 */
export const getOrCreateSettings = async () => {
  let settings = await prisma.storeSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await prisma.storeSettings.create({
      data: {
        id: 'default',
        brandName: 'KIRSAB',
        brandNameHindi: 'किरसाब',
        tagline: 'सब्ज़ी | किराना | घर तक',
        taglineEnglish: 'Vegetables | Grocery | Direct to your Doorstep',
        whatsappNumber: '918808481400',
        serviceAreaPrimary: 'Shervani Legacy',
        serviceAreaCity: 'Prayagraj',
        serviceAreaState: 'Uttar Pradesh',
        serviceAreaPincode: '211011',
        serviceAreaDescription: 'वर्तमान में केवल शेरवानी लेगेसी (Shervani Legacy) एवं आसपास के चयनित फ्लैट्स के लिए उपलब्ध।',
        minOrderValue: 150,
        standardDeliveryFee: 10,
        freeDeliveryThreshold: 299,
        isStoreOpen: true,
        deliverySlotsJson: JSON.stringify([
          {
            id: 'morning',
            label: 'सुबह का स्लॉट (Morning Slot)',
            time: '07:00 AM - 10:00 AM',
            note: 'सुबह ताज़ी सब्ज़ियों के साथ डिलीवरी',
          },
          {
            id: 'evening',
            label: 'शाम का स्लॉट (Evening Slot)',
            time: '05:00 PM - 08:00 PM',
            note: 'शाम के भोजन की तैयारी के लिए समय पर डिलीवरी',
          },
        ]),
      },
    });
  }

  return settings;
};

/**
 * Public: Get customer-facing store settings
 */
export const getPublicSettings = async (req, res) => {
  try {
    const rawSettings = await getOrCreateSettings();

    let deliverySlots = [];
    try {
      deliverySlots = JSON.parse(rawSettings.deliverySlotsJson);
    } catch (e) {
      deliverySlots = [];
    }

    const isWhatsAppConfigured =
      rawSettings.whatsappNumber &&
      rawSettings.whatsappNumber !== 'REPLACE_WITH_BUSINESS_NUMBER' &&
      rawSettings.whatsappNumber.replace(/[^0-9]/g, '').length >= 10;

    return res.json({
      success: true,
      data: {
        brandName: rawSettings.brandName,
        brandNameHindi: rawSettings.brandNameHindi,
        tagline: rawSettings.tagline,
        taglineEnglish: rawSettings.taglineEnglish,
        whatsappNumber: rawSettings.whatsappNumber,
        isWhatsAppConfigured,
        serviceArea: {
          primary: rawSettings.serviceAreaPrimary,
          city: rawSettings.serviceAreaCity,
          state: rawSettings.serviceAreaState,
          pincode: rawSettings.serviceAreaPincode,
          description: rawSettings.serviceAreaDescription,
        },
        pricingRules: {
          minOrderValue: rawSettings.minOrderValue,
          standardDeliveryFee: rawSettings.standardDeliveryFee,
          freeDeliveryThreshold: rawSettings.freeDeliveryThreshold,
          currencySymbol: '₹',
          currencyCode: 'INR',
        },
        deliverySlots,
        isStoreOpen: rawSettings.isStoreOpen,
      },
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'सेटिंग्स लोड करने में त्रुटि (Failed to load settings)',
      error: error.message,
    });
  }
};

/**
 * Admin: Update store settings
 */
export const updateSettingsAdmin = async (req, res) => {
  try {
    const {
      brandName,
      brandNameHindi,
      tagline,
      taglineEnglish,
      whatsappNumber,
      serviceAreaPrimary,
      serviceAreaCity,
      serviceAreaState,
      serviceAreaPincode,
      serviceAreaDescription,
      minOrderValue,
      standardDeliveryFee,
      freeDeliveryThreshold,
      isStoreOpen,
      deliverySlots,
    } = req.body;

    const updateData = {};

    if (brandName !== undefined) updateData.brandName = brandName.trim();
    if (brandNameHindi !== undefined) updateData.brandNameHindi = brandNameHindi.trim();
    if (tagline !== undefined) updateData.tagline = tagline.trim();
    if (taglineEnglish !== undefined) updateData.taglineEnglish = taglineEnglish.trim();

    if (whatsappNumber !== undefined) {
      updateData.whatsappNumber = whatsappNumber.trim();
    }

    if (serviceAreaPrimary !== undefined) updateData.serviceAreaPrimary = serviceAreaPrimary.trim();
    if (serviceAreaCity !== undefined) updateData.serviceAreaCity = serviceAreaCity.trim();
    if (serviceAreaState !== undefined) updateData.serviceAreaState = serviceAreaState.trim();
    if (serviceAreaPincode !== undefined) updateData.serviceAreaPincode = serviceAreaPincode.trim();
    if (serviceAreaDescription !== undefined) updateData.serviceAreaDescription = serviceAreaDescription.trim();

    if (minOrderValue !== undefined) {
      const val = Number(minOrderValue);
      if (val < 0) throw new Error('न्यूनतम ऑर्डर मूल्य 0 या अधिक होना चाहिए');
      updateData.minOrderValue = val;
    }

    if (standardDeliveryFee !== undefined) {
      const fee = Number(standardDeliveryFee);
      if (fee < 0) throw new Error('डिलीवरी शुल्क 0 या अधिक होना चाहिए');
      updateData.standardDeliveryFee = fee;
    }

    if (freeDeliveryThreshold !== undefined) {
      const threshold = Number(freeDeliveryThreshold);
      if (threshold < 0) throw new Error('मुफ़्त डिलीवरी सीमा 0 या अधिक होनी चाहिए');
      updateData.freeDeliveryThreshold = threshold;
    }

    if (isStoreOpen !== undefined) updateData.isStoreOpen = Boolean(isStoreOpen);

    if (deliverySlots !== undefined) {
      if (Array.isArray(deliverySlots)) {
        updateData.deliverySlotsJson = JSON.stringify(deliverySlots);
      } else if (typeof deliverySlots === 'string') {
        updateData.deliverySlotsJson = deliverySlots;
      }
    }

    const updated = await prisma.storeSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    });

    return res.json({
      success: true,
      message: 'स्टोर सेटिंग्स सफलतापूर्वक अपडेट की गईं (Store settings updated)',
      data: updated,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'सेटिंग्स अपडेट करने में त्रुटि',
    });
  }
};
