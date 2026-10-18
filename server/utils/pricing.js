/**
 * Server-side order verification & calculation logic
 * Never trust client prices or client-calculated totals!
 */

export const calculateOrderTotals = ({ items, products, storeSettings }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('टोकरी खाली है (Order items cannot be empty)');
  }

  const { minOrderValue, standardDeliveryFee, freeDeliveryThreshold, isStoreOpen } = storeSettings;

  if (!isStoreOpen) {
    throw new Error('स्टोर अभी नए ऑर्डर्स के लिए बंद है (Store is currently closed for orders)');
  }

  const productMap = new Map(products.map(p => [p.id, p]));
  let subtotal = 0;
  const verifiedOrderItems = [];

  for (const item of items) {
    const { productId, quantity } = item;

    if (!productId || typeof quantity !== 'number') {
      throw new Error(`अमान्य उत्पाद डेटा (Invalid product item in request)`);
    }

    const intQty = Math.floor(quantity);
    if (intQty <= 0 || !Number.isInteger(intQty)) {
      throw new Error(`मात्रा सकारात्मक पूर्णांक होनी चाहिए (Quantity must be a positive integer)`);
    }

    const product = productMap.get(productId);
    if (!product) {
      throw new Error(`उत्पाद नहीं मिला (Product ID '${productId}' not found)`);
    }

    if (!product.isActive) {
      throw new Error(`'${product.nameHi}' वर्तमान में सक्रिय नहीं है (Product is inactive)`);
    }

    if (!product.inStock) {
      throw new Error(`'${product.nameHi}' का स्टॉक समाप्त हो चुका है (Product is out of stock)`);
    }

    if (!product.isConfigured || product.price === null || product.price <= 0) {
      throw new Error(`'${product.nameHi}' का भाव अभी निर्धारित नहीं है (Product price is not configured)`);
    }

    const unitPrice = Number(product.price);
    const lineTotal = Number((unitPrice * intQty).toFixed(2));
    subtotal += lineTotal;

    // Build immutable snapshot record
    verifiedOrderItems.push({
      productId: product.id,
      productNameEn: product.nameEn,
      productNameHi: product.nameHi,
      unit: product.unit,
      unitPrice,
      quantity: intQty,
      lineTotal,
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  // Check minimum order rule
  if (subtotal < minOrderValue) {
    throw new Error(
      `न्यूनतम ऑर्डर मूल्य ₹${minOrderValue} है। वर्तमान योग ₹${subtotal} है (Minimum order value is ₹${minOrderValue})`
    );
  }

  // Delivery fee rules
  let deliveryFee = standardDeliveryFee;
  if (subtotal >= freeDeliveryThreshold) {
    deliveryFee = 0;
  }
  deliveryFee = Number(deliveryFee.toFixed(2));

  const finalTotal = Number((subtotal + deliveryFee).toFixed(2));

  return {
    subtotal,
    deliveryFee,
    finalTotal,
    verifiedOrderItems,
  };
};
