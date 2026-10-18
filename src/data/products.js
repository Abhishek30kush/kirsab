/**
 * ==============================================================================
 * KIRSAB PRODUCT CATALOGUE (किरसाब सब्ज़ी सूची)
 * ==============================================================================
 * 
 * प्रिय स्टोर मालिक (Dear Store Owner),
 * सब्ज़ियों के ताज़ा भाव (Price), उपलब्धता (In Stock / Out of Stock), और इकाइयां (Unit)
 * आप नीचे दी गई सूची में सीधे बदल सकते हैं।
 * 
 * नियम (Rules):
 * 1. price: अगर आपको किसी सब्ज़ी का भाव तय नहीं है, तो price: null रखें।
 *    वेबसाइट पर वह सब्ज़ी "भाव जल्द उपलब्ध" (Price to be updated) दिखेगी और कोई ग्राहक उसे बिना भाव के ऑर्डर नहीं कर पाएगा।
 *    कभी भी शून्य (0) न डालें।
 * 2. inStock: अगर मंडी में सब्ज़ी उपलब्ध नहीं है तो inStock: false कर दें।
 * 3. unit: '1 kg', '500 g', '250 g', '100 g', '1 bunch (गड्डी)', या 'piece (पीस)'।
 */

export const PRODUCT_CATEGORIES = [
  { id: 'all', nameHi: 'सभी सब्ज़ियाँ', nameEn: 'All Vegetables' },
  { id: 'daily-essentials', nameHi: 'रोज़ाना ज़रूरी', nameEn: 'Daily Essentials' },
  { id: 'fresh-greens', nameHi: 'ताज़ी हरी सब्ज़ियाँ', nameEn: 'Fresh Greens' },
  { id: 'aromatics', nameHi: 'अदरक, मिर्च व तड़का', nameEn: 'Aromatics & Herbs' },
];

export const INITIAL_PRODUCTS = [
  {
    id: 'potato',
    nameEn: 'Potato',
    nameHi: 'आलू',
    category: 'daily-essentials',
    unit: '1 kg',
    unitHindi: 'प्रति किलो',
    unitShort: 'kg',
    price: 30, // ₹30 per 1 kg (Configured sample local rate)
    isConfigured: true,
    inStock: true,
    badge: 'रोज़ाना ज़रूरी',
    description: 'साफ-सुथरे, ठोस व छंटाई किए हुए ताज़े आलू। रोज़ की सब्ज़ी के लिए उत्तम।',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🥔',
  },
  {
    id: 'onion',
    nameEn: 'Onion',
    nameHi: 'प्याज़',
    category: 'daily-essentials',
    unit: '1 kg',
    unitHindi: 'प्रति किलो',
    unitShort: 'kg',
    price: 35, // ₹35 per 1 kg
    isConfigured: true,
    inStock: true,
    badge: 'ताज़ा स्टॉक',
    description: 'लाल, सूखा और कुरकुरा प्याज़, दाल-तड़के और सलाद के लिए।',
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🧅',
  },
  {
    id: 'tomato',
    nameEn: 'Tomato',
    nameHi: 'टमाटर',
    category: 'daily-essentials',
    unit: '1 kg',
    unitHindi: 'प्रति किलो',
    unitShort: 'kg',
    price: 25, // ₹25 per 1 kg
    isConfigured: true,
    inStock: true,
    badge: 'देसी ताज़ा',
    description: 'रसीले लाल और टाइट टमाटर, तरीदार सब्ज़ी और ग्रेवी के लिए बेहतरीन।',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🍅',
  },
  {
    id: 'bottle-gourd',
    nameEn: 'Bottle Gourd (Lauki)',
    nameHi: 'लौकी / घिया',
    category: 'fresh-greens',
    unit: '1 piece (लगभग 1 kg)',
    unitHindi: 'प्रति पीस (~1 किलो)',
    unitShort: 'piece',
    price: 30, // ₹30 per piece
    isConfigured: true,
    inStock: true,
    badge: 'हल्की व सेहतमंद',
    description: 'मुलायम, कच्ची व हरी लौकी, जूस एवं दाल-लौकी के लिए उपयुक्त।',
    image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🥒',
  },
  {
    id: 'brinjal',
    nameEn: 'Brinjal (Baingan)',
    nameHi: 'बैंगन (भर्ता/गोल)',
    category: 'fresh-greens',
    unit: '500 g',
    unitHindi: 'प्रति 500 ग्राम',
    unitShort: '500g',
    price: 25, // ₹25 per 500g
    isConfigured: true,
    inStock: true,
    badge: 'चमकदार व ताज़ा',
    description: 'बिना कीड़े का ताजा बैंगन, चोखा और कलौंजी बनाने हेतु आदर्श।',
    image: 'https://images.unsplash.com/photo-1628773822503-930a84d9f04e?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🍆',
  },
  {
    id: 'okra',
    nameEn: 'Okra (Bhindi)',
    nameHi: 'भिंडी',
    category: 'fresh-greens',
    unit: '500 g',
    unitHindi: 'प्रति 500 ग्राम',
    unitShort: '500g',
    price: 30, // ₹30 per 500g
    isConfigured: true,
    inStock: true,
    badge: 'कुरकुरी व ताज़ी',
    description: 'छोटी, हरी और आसानी से टूटने वाली ताज़ी भिंडी।',
    image: 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🌱',
  },
  {
    id: 'cabbage',
    nameEn: 'Cabbage',
    nameHi: 'पत्ता गोभी',
    category: 'fresh-greens',
    unit: '1 piece (लगभग 600-800g)',
    unitHindi: 'प्रति पीस (मध्यम)',
    unitShort: 'piece',
    price: 25, // ₹25 per piece
    isConfigured: true,
    inStock: true,
    badge: 'पैक पत्ता गोभी',
    description: 'कसा हुआ ताजा हरा बंदगोभी, सलाद और भुर्जी के लिए।',
    image: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🥬',
  },
  {
    id: 'cauliflower',
    nameEn: 'Cauliflower',
    nameHi: 'फूलगोभी',
    category: 'fresh-greens',
    unit: '1 piece (लगभग 500-700g)',
    unitHindi: 'प्रति फूल',
    unitShort: 'piece',
    price: 30, // ₹30 per piece
    isConfigured: true,
    inStock: true,
    badge: 'साफ सफेद फूल',
    description: 'सफेद, टाइट और बिना दाग वाला ताज़ा फूलगोभी।',
    image: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🥦',
  },
  {
    id: 'green-chilli',
    nameEn: 'Green Chilli',
    nameHi: 'हरी मिर्च',
    category: 'aromatics',
    unit: '100 g',
    unitHindi: 'प्रति 100 ग्राम',
    unitShort: '100g',
    price: 10, // ₹10 per 100g
    isConfigured: true,
    inStock: true,
    badge: 'तीखी व ताज़ी',
    description: 'तेज हरी, बिना डंठल टूटी हुई तीखी मिर्च।',
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🌶️',
  },
  {
    id: 'ginger',
    nameEn: 'Ginger (Adrak)',
    nameHi: 'अदरक',
    category: 'aromatics',
    unit: '100 g',
    unitHindi: 'प्रति 100 ग्राम',
    unitShort: '100g',
    price: 15, // ₹15 per 100g
    isConfigured: true,
    inStock: true,
    badge: 'मसालेदार चाय हेतु',
    description: 'साफ रेशेदार सूखा अदरक, चाय व सब्ज़ी के तड़के के लिए।',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🫚',
  },
  {
    id: 'garlic',
    nameEn: 'Garlic (Lahsun)',
    nameHi: 'लहसुन',
    category: 'aromatics',
    unit: '100 g',
    unitHindi: 'प्रति 100 ग्राम',
    unitShort: '100g',
    price: 20, // ₹20 per 100g
    isConfigured: true,
    inStock: true,
    badge: 'मोटी कलियाँ',
    description: 'सफेद, सूखे और बड़े दानों वाला ताज़ा लहसुन।',
    image: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🧄',
  },
  {
    id: 'coriander',
    nameEn: 'Fresh Coriander (Dhaniya)',
    nameHi: 'हरा धनिया',
    category: 'aromatics',
    unit: '1 bunch (गड्डी ~100g)',
    unitHindi: 'प्रति गड्डी',
    unitShort: 'bunch',
    price: 10, // ₹10 per bunch
    isConfigured: true,
    inStock: true,
    badge: 'खुशबूदार ताज़ा',
    description: 'हरी पत्तियों वाला महकदार देसी धनिया, गार्निश व चटनी के लिए।',
    image: 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🌿',
  },
  {
    id: 'lemon',
    nameEn: 'Lemon (Nimbu)',
    nameHi: 'नींबू',
    category: 'aromatics',
    unit: '4 pieces (4 पीस)',
    unitHindi: '4 पीस का सेट',
    unitShort: '4 pcs',
    // Unconfigured example demonstrating the strict rule:
    // "Clearly mark unconfigured products as unavailable for ordering until the owner enters verified prices and confirms availability. Never show a fake ₹0 price or permit checkout with an unconfigured price."
    price: null, // OWNER NOTE: भाव तय होने पर यहाँ संख्या लिखें (e.g., 20)
    isConfigured: false,
    inStock: true,
    badge: 'मूल्य प्रतीक्षारत',
    description: 'रसीला पीला कागज़ी नींबू। दैनिक मंडी भाव पुष्टि के बाद उपलब्ध होगा।',
    image: 'https://images.unsplash.com/photo-1587496679742-bad502958fbe?auto=format&fit=crop&w=600&q=80',
    fallbackEmoji: '🍋',
  },
];
