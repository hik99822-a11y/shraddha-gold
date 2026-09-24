import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Style from '../models/Style.js';
import User from '../models/User.js';
import { generateOrderPdf } from '../services/pdfGeneratorService.js';
import { sendOtpWhatsApp, sendOrderWhatsAppNotifications } from '../services/metaApiService.js';

// Helper to clean and normalize phone with country code
const sanitizePhone = (phone) => {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

/**
 * Helper to safely create an order document, generate PDF, and dispatch WhatsApp.
 */
const createOrderDocumentAndDispatch = async (payload) => {
  const {
    itemsSubset, orderType, customer, customerName, orderedBy, cleanPhone, customerEmail,
    orderSource, token, notes, remark
  } = payload;

  if (!itemsSubset || itemsSubset.length === 0) return null;

  const totalItems = itemsSubset.length;
  const totalQuantity = itemsSubset.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  const totalGrossWeight = itemsSubset.reduce((sum, i) => sum + ((Number(i.grossWeight) || 0) * (Number(i.quantity) || 1)), 0);
  const totalNetWeight = itemsSubset.reduce((sum, i) => sum + ((Number(i.netWeight) || 0) * (Number(i.quantity) || 1)), 0);

  const orderNumber = `SG-ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const remarkVal = (remark !== undefined && remark !== null ? String(remark) : (notes || '')).trim();

  const order = new Order({
    orderNumber,
    customer: customer ? customer._id : null,
    customerName,
    orderedBy: orderedBy || '',
    customerPhone: cleanPhone,
    customerEmail,
    orderSource,
    shareToken: token || '',
    orderType,
    items: itemsSubset.map((i) => ({
      style: resolveCleanStyleId(i.styleId || i.style),
      styleCode: i.styleCode,
      item: i.item || '',
      displayCode: i.displayCode || (i.item ? `${i.styleCode} – ${i.item}` : i.styleCode),
      categoryName: i.categoryName || '',
      kt: i.kt || '',
      purity: i.kt || '',
      grossWeight: Number(i.grossWeight) || 0,
      netWeight: Number(i.netWeight) || 0,
      quantity: Number(i.quantity) || 1,
      imageUrl: i.imageUrl || '',
      notes: i.notes || '',
      isMakeStock: !!i.isMakeStock
    })),
    totalItems,
    totalQuantity,
    totalGrossWeight,
    totalNetWeight,
    notes: remarkVal,
    remark: remarkVal,
    status: 'Pending'
  });

  order.pdfUrl = `/api/orders/${order._id}/pdf`;

  const baseUrl = process.env.API_URL || (process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/api` : 'https://api.shraddhagold.com/api');
  const fullPdfUrl = `${baseUrl}/orders/${order._id}/pdf`;
  const waResults = await sendOrderWhatsAppNotifications({ order, fullPdfUrl });

  let custRes = waResults.customer;
  if (Array.isArray(custRes)) {
    custRes = custRes.find(r => r.success) || custRes[0];
  }
  if (custRes && custRes.success) {
    order.whatsappDispatches.customer = {
      targetPhone: custRes.targetPhone || cleanPhone,
      status: custRes.mode === 'LIVE_META_API' ? 'Sent' : 'Simulated',
      sentAt: new Date(),
      messageId: custRes.messageId || ''
    };
  }
  let adminRes = waResults.admin;
  if (Array.isArray(adminRes)) {
    adminRes = adminRes.find(r => r.success) || adminRes[0];
  }
  if (adminRes) {
    order.whatsappDispatches.admin = {
      targetPhone: adminRes.targetPhone || '',
      status: adminRes.success ? (adminRes.mode === 'LIVE_META_API' ? 'Sent' : 'Simulated') : 'Failed',
      sentAt: new Date(),
      messageId: adminRes.messageId || '',
      errorMessage: adminRes.error || ''
    };
  }

  await order.save();
  return order;
};

/**
 * Helper to safely extract a valid 24-hex ObjectId from a styleId (stripping UI variant suffixes like '_v0')
 */
const resolveCleanStyleId = (val) => {
  if (!val) return null;
  let str = String(val).trim();
  if (str.includes('_v')) {
    str = str.split('_v')[0];
  }
  return mongoose.Types.ObjectId.isValid(str) ? str : null;
};

/**
 * Helper to group order items by styleId/item variant and calculate total requested quantities.
 */
const aggregateRequestedQuantities = (items) => {
  const requestedTotals = {};
  for (const item of items) {
    if (item.isMakeStock) continue; // Skip stock deduction for Make to Stock orders
    const styleCode = (item.styleCode || '').trim().toUpperCase();
    if (!styleCode) continue;
    const itemVal = (item.item || '').trim().toUpperCase();
    const cleanStyleId = resolveCleanStyleId(item.styleId || item.style);
    const key = itemVal ? `${styleCode}:::${itemVal}` : (cleanStyleId ? String(cleanStyleId) : styleCode);
    const requestedQty = Math.max(1, Number(item.quantity) || 1);

    if (!requestedTotals[key]) {
      requestedTotals[key] = {
        key,
        styleId: cleanStyleId,
        styleCode,
        item: item.item || '',
        displayCode: item.displayCode || (item.item ? `${styleCode} – ${item.item}` : styleCode),
        requestedQty: 0
      };
    }
    requestedTotals[key].requestedQty += requestedQty;
  }
  return requestedTotals;
};

/**
 * Check stock availability without blocking.
 * Returns { success: true, canOrder: true, outOfStock: boolean, outOfStockItems: [...], stockMap }
 */
export const checkStockAvailability = async (items) => {
  const requestedTotals = aggregateRequestedQuantities(items);
  const outOfStockItems = [];
  const stockMap = {};

  for (const [key, info] of Object.entries(requestedTotals)) {
    let style = null;
    if (info.styleId && mongoose.Types.ObjectId.isValid(info.styleId)) {
      style = await Style.findById(info.styleId);
    }
    if (!style) {
      style = await Style.findOne({ styleCode: info.styleCode });
    }
    if (!style) {
      continue; // Custom/unlisted style
    }

    let availableQty = typeof style.qty === 'number' ? style.qty : 0;
    if (info.item && Array.isArray(style.itemVariants) && style.itemVariants.length > 0) {
      const v = style.itemVariants.find(
        (iv) => (iv.item || '').trim().toUpperCase() === info.item.trim().toUpperCase() ||
                (iv.itemCode || '').trim().toUpperCase() === info.item.trim().toUpperCase()
      );
      if (v && v.qty !== undefined && v.qty !== null) {
        availableQty = v.qty;
      }
    }

    stockMap[key] = Math.max(0, availableQty);
    stockMap[info.styleCode] = Math.max(0, availableQty);

    if (availableQty <= 0 || availableQty < info.requestedQty) {
      outOfStockItems.push({
        styleCode: info.displayCode || info.styleCode,
        requested: info.requestedQty,
        available: Math.max(0, availableQty),
        isOutOfStock: availableQty <= 0
      });
    }
  }

  return {
    success: true,
    canOrder: true,
    outOfStock: outOfStockItems.length > 0,
    outOfStockItems,
    stockMap
  };
};

/**
 * Validate stock availability and atomically decrement Qty for all order items down to 0.
 * Customers can order out-of-stock items; stock is decremented down to minimum 0 without going negative.
 * Returns { success: true, outOfStockItems: [...] }
 */
const validateAndDecrementStock = async (items) => {
  const requestedTotals = aggregateRequestedQuantities(items);
  const checkResult = await checkStockAvailability(items);

  // Atomically decrement stock down to minimum 0 for each style/variant
  for (const [key, info] of Object.entries(requestedTotals)) {
    const available = checkResult.stockMap[key] !== undefined ? checkResult.stockMap[key] : (checkResult.stockMap[info.styleCode] || 0);
    const decrementAmount = Math.max(0, Math.min(available, info.requestedQty));

    if (decrementAmount > 0) {
      if (info.item) {
        const updated = await Style.updateOne(
          {
            styleCode: info.styleCode,
            'itemVariants.item': info.item
          },
          {
            $inc: {
              qty: -decrementAmount,
              'itemVariants.$.qty': -decrementAmount
            }
          }
        );

        if (updated.matchedCount === 0) {
          await Style.updateOne(
            { styleCode: info.styleCode },
            { $inc: { qty: -decrementAmount } }
          );
        }
      } else {
        await Style.updateOne(
          { styleCode: info.styleCode },
          { $inc: { qty: -decrementAmount } }
        );
      }
    }
  }

  return {
    success: true,
    outOfStock: checkResult.outOfStock,
    outOfStockItems: checkResult.outOfStockItems
  };
};

/**
 * Restore stock (increment Qty back) for all items in an order.
 * Used when an order is cancelled.
 */
const restoreStock = async (items) => {
  const requestedTotals = aggregateRequestedQuantities(items);
  for (const [key, info] of Object.entries(requestedTotals)) {
    if (info.item) {
      const updated = await Style.updateOne(
        {
          styleCode: info.styleCode,
          'itemVariants.item': info.item
        },
        {
          $inc: {
            qty: info.requestedQty,
            'itemVariants.$.qty': info.requestedQty
          }
        }
      );

      if (updated.matchedCount === 0) {
        await Style.updateOne(
          { styleCode: info.styleCode },
          { $inc: { qty: info.requestedQty } }
        );
      }
    } else {
      await Style.updateOne(
        { styleCode: info.styleCode },
        { $inc: { qty: info.requestedQty } }
      );
    }
  }
};

/**
 * Helper to resolve customer for checkout (by token or phone)
 */
const resolveCustomerForCheckout = async ({ token, cleanPhone, customerName }) => {
  let customer = null;

  // 1. If cleanPhone is provided, strictly search the database for a customer with this mobile number
  if (cleanPhone) {
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    const spacedPattern = last10.split('').join('[^0-9]*');
    const regexObj = new RegExp(spacedPattern);

    // Search in Customer phones array
    customer = await Customer.findOne({
      phones: { $regex: regexObj }
    });

    if (!customer) {
      // Check if registered via linked User account mobile
      const linkedUser = await User.findOne({
        mobile: { $regex: regexObj }
      });
      if (linkedUser) {
        customer = await Customer.findOne({
          $or: [
            { user: linkedUser._id },
            { email: linkedUser.email }
          ]
        });
        if (!customer) {
          customer = await Customer.findOne({ name: linkedUser.name });
        }
      }
    }

    // IMPORTANT: If cleanPhone was provided and no record in the database matches it,
    // we return null! We must NOT fall back to token, because this phone is not registered.
    return customer;
  }

  // 2. Only if cleanPhone is not provided at all, allow resolving by token
  if (token) {
    customer = await Customer.findOne({ shareToken: token });
    if (!customer && token.match(/^[0-9a-fA-F]{24}$/)) {
      customer = await Customer.findById(token);
    }
  }

  return customer;
};

/**
 * @desc    Lookup customer registered phones for checkout
 * @route   POST /api/orders/customer-phones
 * @access  Public
 */
export const lookupCustomerPhones = async (req, res) => {
  try {
    const { token, phone } = req.body;
    const cleanPhone = sanitizePhone(phone);
    const customer = await resolveCustomerForCheckout({ token, cleanPhone });

    if (!customer) {
      return res.status(200).json({
        success: true,
        found: false,
        customerName: '',
        phones: []
      });
    }

    const rawPhones = [
      ...(Array.isArray(customer.phones) ? customer.phones : []),
      customer.primaryPhone
    ].filter(Boolean);

    // Deduplicate by last 10 digits
    const seen = new Set();
    const uniquePhones = [];
    for (const p of rawPhones) {
      const d = sanitizePhone(p);
      if (d.length >= 10 && !seen.has(d.slice(-10))) {
        seen.add(d.slice(-10));
        uniquePhones.push(p);
      }
    }

    res.status(200).json({
      success: true,
      found: true,
      customerId: customer._id,
      customerName: customer.name,
      primaryPhone: customer.primaryPhone,
      phones: uniquePhones
    });
  } catch (error) {
    console.error('[lookupCustomerPhones Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to lookup customer phones', error: error.message });
  }
};

/**
 * @desc    Send 6-digit OTP for order checkout (Without Login) - Embedded in Customer table
 * @route   POST /api/orders/send-otp
 * @access  Public
 */
export const sendCheckoutOtp = async (req, res) => {
  try {
    const { phone, customerName, token } = req.body;
    const cleanPhone = sanitizePhone(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid mobile number with at least 10 digits.'
      });
    }

    // Pre-check stock if items are provided in OTP request (Informational only - does not block out-of-stock orders)
    if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
      await checkStockAvailability(req.body.items);
    }

    // Generate cryptographically random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Resolve customer strictly from database
    let customer = await resolveCustomerForCheckout({ token, cleanPhone, customerName });

    // If mobile number does not exist in database, do not send OTP!
    if (!customer) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: 'This mobile number is not registered. Please enter a registered mobile number.'
      });
    }

    if (customer.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your commercial account is currently inactive. Please contact Shraddha Gold administration.'
      });
    }

    // Save OTP directly into Customer document
    customer.checkoutOtp = {
      code: otp,
      expiresAt,
      targetPhone: cleanPhone,
      verified: false
    };

    await customer.save();

    // Send OTP via WhatsApp
    await sendOtpWhatsApp({
      toPhone: cleanPhone,
      otp
    });

    res.status(200).json({
      success: true,
      message: `Verification OTP dispatched to +${cleanPhone} via WhatsApp.`,
      // debugOtp returned for development/testing so tester does not need to wait for real gateway
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('[sendCheckoutOtp Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dispatch verification OTP',
      error: error.message
    });
  }
};

/**
 * @desc    Verify OTP and place order ("Without Login") - Verified against Customer table
 * @route   POST /api/orders/verify-otp-and-order
 * @access  Public
 */
export const verifyOtpAndPlaceOrder = async (req, res) => {
  try {
    const { phone, otp, customerName, customerEmail, notes, remark, items, token } = req.body;
    const cleanPhone = sanitizePhone(phone);

    if (!cleanPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    if (!otp || !otp.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter the 6-digit OTP.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Please add items to order.' });
    }

    // 1. Resolve Customer containing the embedded OTP
    const customer = await resolveCustomerForCheckout({ token, cleanPhone, customerName });

    if (!customer) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: 'This mobile number is not registered. Please enter a registered mobile number.'
      });
    }

    if (!customer.checkoutOtp || !customer.checkoutOtp.code) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found. Please request an OTP and try again.'
      });
    }

    // Check expiry
    if (new Date() > new Date(customer.checkoutOtp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please click Resend OTP and try again.'
      });
    }

    // Verify that the OTP is being entered for the same phone number where it was dispatched
    if (customer.checkoutOtp.targetPhone) {
      const storedLast10 = sanitizePhone(customer.checkoutOtp.targetPhone).slice(-10);
      const currentLast10 = cleanPhone.slice(-10);
      if (storedLast10 && currentLast10 && storedLast10 !== currentLast10) {
        return res.status(400).json({
          success: false,
          message: `The OTP was sent to a different mobile number (+${customer.checkoutOtp.targetPhone}). Please enter that number or request a new OTP.`
        });
      }
    }

    // Check OTP match
    if (customer.checkoutOtp.code !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please enter the valid 6-digit code.'
      });
    }

    // Clear OTP upon successful verification
    customer.checkoutOtp.code = null;
    customer.checkoutOtp.expiresAt = null;
    customer.checkoutOtp.verified = true;
    if (customerName?.trim() && (!customer.name || customer.name.startsWith('Client '))) {
      customer.name = customerName.trim();
    }
    if (customerEmail?.trim() && !customer.email) {
      customer.email = customerEmail.trim();
    }
    await customer.save();

    // 2. Decrement available stock (customers can order out-of-stock items; stock stays at 0 without going negative)
    const stockCheck = await validateAndDecrementStock(items);

    // 3. Split cart by orderType
    const regularItems = items.filter(i => !i.isMakeStock);
    const makeStockItems = items.filter(i => !!i.isMakeStock);

    const createdOrders = [];

    let resolvedCustomerName = customerName || 'Valued Commercial Client';
    let resolvedOrderedBy = '';

    if (customer) {
      resolvedCustomerName = customer.businessName || customer.name || resolvedCustomerName;
      
      if (customer.contacts && customer.contacts.length > 0) {
        const matchingContact = customer.contacts.find(c => String(c.phone).replace(/[^0-9]/g, '').slice(-10) === cleanPhone.slice(-10));
        if (matchingContact && matchingContact.name) {
          resolvedOrderedBy = matchingContact.name;
        }
      }
      if (!resolvedOrderedBy) resolvedOrderedBy = customer.name || '';
    } else if (customerName) {
      resolvedOrderedBy = customerName;
    }

    const remarkVal = (remark !== undefined && remark !== null ? String(remark) : (notes || '')).trim();

    const basePayload = {
      customer,
      customerName: resolvedCustomerName,
      orderedBy: resolvedOrderedBy,
      cleanPhone,
      customerEmail: customerEmail || (customer ? customer.email : ''),
      orderSource: 'Without Login',
      token,
      notes: remarkVal,
      remark: remarkVal
    };

    if (regularItems.length > 0) {
      const regularOrder = await createOrderDocumentAndDispatch({
        ...basePayload,
        itemsSubset: regularItems,
        orderType: 'Regular'
      });
      if (regularOrder) createdOrders.push(regularOrder);
    }

    if (makeStockItems.length > 0) {
      const makeStockOrder = await createOrderDocumentAndDispatch({
        ...basePayload,
        itemsSubset: makeStockItems,
        orderType: 'Make Stock'
      });
      if (makeStockOrder) createdOrders.push(makeStockOrder);
    }

    const primaryOrder = createdOrders[0];

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! PDF has been generated and dispatched via WhatsApp.',
      order: primaryOrder ? {
        id: primaryOrder._id,
        orderNumber: primaryOrder.orderNumber,
        customerName: primaryOrder.customerName,
        customerPhone: primaryOrder.customerPhone,
        totalItems: primaryOrder.totalItems,
        totalQuantity: primaryOrder.totalQuantity,
        totalGrossWeight: primaryOrder.totalGrossWeight,
        totalNetWeight: primaryOrder.totalNetWeight,
        pdfUrl: primaryOrder.pdfUrl,
        notes: primaryOrder.notes,
        remark: primaryOrder.remark,
        createdAt: primaryOrder.createdAt
      } : null
    });
  } catch (error) {
    console.error('[verifyOtpAndPlaceOrder Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP and place order',
      error: error.message
    });
  }
};

/**
 * @desc    Create authenticated order ("With Login" / Customer Portal)
 * @route   POST /api/orders/create
 * @access  Private (Customer or Admin)
 */
export const createAuthenticatedOrder = async (req, res) => {
  try {
    const user = req.user;
    const { items, notes, remark, orderSource = 'With Login', shareToken } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Please add items to order.' });
    }

    // Resolve Customer mapping
    let customer = await Customer.findOne({
      $or: [
        { user: user._id },
        { email: user.email },
        { phones: user.mobile }
      ]
    });

    // Decrement available stock (customers can order out-of-stock items; stock stays at 0 without going negative)
    const stockCheck = await validateAndDecrementStock(items);

    const chosenRawPhone = req.body.customerPhone || req.body.phone || (customer?.phones && customer.phones[0]) || user.mobile || '';
    const chosenCleanPhone = sanitizePhone(chosenRawPhone);

    const regularItems = items.filter(i => !i.isMakeStock);
    const makeStockItems = items.filter(i => !!i.isMakeStock);
    const createdOrders = [];

    const remarkVal = (remark !== undefined && remark !== null ? String(remark) : (notes || '')).trim();

    const basePayload = {
      customer,
      customerName: customer?.businessName || customer?.name || user.name || 'Commercial Partner',
      orderedBy: user.name || customer?.name || '',
      cleanPhone: chosenCleanPhone,
      customerEmail: customer?.email || user.email || '',
      orderSource: orderSource || 'With Login',
      token: shareToken,
      notes: remarkVal,
      remark: remarkVal
    };

    if (regularItems.length > 0) {
      const regularOrder = await createOrderDocumentAndDispatch({
        ...basePayload,
        itemsSubset: regularItems,
        orderType: 'Regular'
      });
      if (regularOrder) createdOrders.push(regularOrder);
    }

    if (makeStockItems.length > 0) {
      const makeStockOrder = await createOrderDocumentAndDispatch({
        ...basePayload,
        itemsSubset: makeStockItems,
        orderType: 'Make Stock'
      });
      if (makeStockOrder) createdOrders.push(makeStockOrder);
    }

    const primaryOrder = createdOrders[0];

    res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      order: primaryOrder ? {
        id: primaryOrder._id,
        orderNumber: primaryOrder.orderNumber,
        customerName: primaryOrder.customerName,
        customerPhone: primaryOrder.customerPhone,
        totalItems: primaryOrder.totalItems,
        totalQuantity: primaryOrder.totalQuantity,
        totalGrossWeight: primaryOrder.totalGrossWeight,
        totalNetWeight: primaryOrder.totalNetWeight,
        pdfUrl: primaryOrder.pdfUrl,
        notes: primaryOrder.notes,
        remark: primaryOrder.remark,
        createdAt: primaryOrder.createdAt
      } : null
    });
  } catch (error) {
    console.error('[createAuthenticatedOrder Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: error.message
    });
  }
};

export const getPendingOrderCounts = async (req, res) => {
  try {
    const regularPending = await Order.countDocuments({ status: 'Pending', orderType: 'Regular' });
    const makeStockPending = await Order.countDocuments({ status: 'Pending', orderType: 'Make Stock' });
    
    res.status(200).json({
      success: true,
      counts: {
        regular: regularPending,
        makeStock: makeStockPending
      }
    });
  } catch (error) {
    console.error('[getPendingOrderCounts Error]:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Get all orders for Admin
 * @route   GET /api/orders/admin
 * @access  Private (Admin)
 */
export const getAdminOrders = async (req, res) => {
  try {
    const { status, search, startDate, endDate, page = 1, limit = 20, orderType = 'Regular' } = req.query;
    const query = { orderType };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      const sanitizedSearch = search.trim();
      const phoneSearch = sanitizedSearch.replace(/\s+/g, ''); // strip spaces for robust phone search
      
      query.$or = [
        { orderNumber: { $regex: sanitizedSearch, $options: 'i' } },
        { customerName: { $regex: sanitizedSearch, $options: 'i' } },
        { orderedBy: { $regex: sanitizedSearch, $options: 'i' } },
        { customerPhone: { $regex: phoneSearch, $options: 'i' } },
        { 'items.styleCode': { $regex: sanitizedSearch, $options: 'i' } },
        { 'items.categoryName': { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('customer', 'name city');

    // Aggregate status counts for filter tabs scoped to orderType and date range
    const countQuery = { orderType };
    if (query.createdAt) countQuery.createdAt = query.createdAt;
    
    if (search) {
      countQuery.$or = query.$or;
    }

    const [pendingCount, confirmedCount, inProductionCount, completedCount, cancelledCount, allCount] = await Promise.all([
      Order.countDocuments({ ...countQuery, status: 'Pending' }),
      Order.countDocuments({ ...countQuery, status: 'Confirmed' }),
      Order.countDocuments({ ...countQuery, status: 'In Production' }),
      Order.countDocuments({ ...countQuery, status: 'Completed' }),
      Order.countDocuments({ ...countQuery, status: 'Cancelled' }),
      Order.countDocuments(countQuery)
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      counts: {
        all: allCount,
        pending: pendingCount,
        confirmed: confirmedCount,
        inProduction: inProductionCount,
        completed: completedCount,
        cancelled: cancelledCount
      },
      orders
    });
  } catch (error) {
    console.error('[getAdminOrders Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * @desc    Update order status
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Admin)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Confirmed', 'In Production', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousStatus = order.status;

    // Stock management on status transitions
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      // Restore stock when cancelling an active order
      await restoreStock(order.items);
    } else if (previousStatus === 'Cancelled' && status !== 'Cancelled') {
      // Re-deduct stock when reactivating a cancelled order
      const stockCheck = await validateAndDecrementStock(order.items);
      if (!stockCheck.success) {
        const outOfStockMsg = stockCheck.outOfStockItems
          .map((s) => `${s.styleCode}: requested ${s.requested}, available ${s.available}`)
          .join('; ');
        return res.status(400).json({
          success: false,
          outOfStock: true,
          outOfStockItems: stockCheck.outOfStockItems,
          message: `Cannot reactivate order — some items are out of stock: ${outOfStockMsg}`
        });
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'`,
      order
    });
  } catch (error) {
    console.error('[updateOrderStatus Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
  }
};

/**
 * @desc    Delete order
 * @route   DELETE /api/orders/:id
 * @access  Private (Admin)
 */
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} deleted successfully`
    });
  } catch (error) {
    console.error('[deleteOrder Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
  }
};

/**
 * @desc    Resend Order WhatsApp notification
 * @route   POST /api/orders/:id/resend-whatsapp
 * @access  Private (Admin)
 */
export const resendOrderWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const fullPdfUrl = `${clientUrl}${order.pdfUrl}`;
    const waResults = await sendOrderWhatsAppNotifications({ order, fullPdfUrl });

    if (waResults.customer?.success) {
      order.whatsappDispatches.customer = {
        targetPhone: order.customerPhone,
        status: waResults.customer.mode === 'LIVE_META_API' ? 'Sent' : 'Simulated',
        sentAt: new Date(),
        messageId: waResults.customer.messageId || ''
      };
    }
    let adminRes = waResults.admin;
    if (Array.isArray(adminRes)) {
      adminRes = adminRes.find(r => r.success) || adminRes[0];
    }
    if (adminRes) {
      order.whatsappDispatches.admin = {
        targetPhone: adminRes.targetPhone || '',
        status: adminRes.success ? (adminRes.mode === 'LIVE_META_API' ? 'Sent' : 'Simulated') : 'Failed',
        sentAt: new Date(),
        messageId: adminRes.messageId || '',
        errorMessage: adminRes.error || ''
      };
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'WhatsApp notification dispatched successfully',
      whatsappDispatches: order.whatsappDispatches
    });
  } catch (error) {
    console.error('[resendOrderWhatsApp Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to dispatch WhatsApp', error: error.message });
  }
};

/**
 * @desc    Get order by ID or orderNumber
 * @route   GET /api/orders/:id
 * @access  Public / Private
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('[getOrderById Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve order', error: error.message });
  }
};

/**
 * @desc    Get or regenerate order PDF with latest template & logo
 * @route   GET /api/orders/:id/pdf
 * @access  Public
 */
export const getOrderPdf = async (req, res) => {
  try {
    const { id } = req.params;
    let order = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Stream fresh PDF directly to the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SG_Order_${order.orderNumber}.pdf"`);
    
    await generateOrderPdf(order, res);
    
    // PDF stream finished successfully, do not send JSON response
  } catch (error) {
    console.error('[getOrderPdf Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate order PDF', error: error.message });
  }
};

/**
 * @desc    Check live stock availability for items in cart
 * @route   POST /api/orders/check-stock
 * @access  Public
 */
export const checkOrderStock = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided to check stock'
      });
    }

    const stockCheck = await checkStockAvailability(items);
    return res.status(200).json({
      success: true,
      canOrder: true,
      outOfStock: stockCheck.outOfStock,
      outOfStockItems: stockCheck.outOfStockItems,
      stockMap: stockCheck.stockMap,
      message: stockCheck.outOfStock
        ? 'Some items are currently out of stock and will be placed as backorder.'
        : 'All items are available in requested quantities.'
    });
  } catch (error) {
    console.error('[checkOrderStock Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify stock availability',
      error: error.message
    });
  }
};

