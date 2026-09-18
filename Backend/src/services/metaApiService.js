/**
 * Meta Cloud API (WhatsApp Business Graph API) Service
 */
import User from '../models/User.js';
import { formatDateIST, formatDateTimeIST } from '../utils/dateUtils.js';

/**
 * Generic WhatsApp message dispatcher (handles Live Meta API or graceful development simulation)
 */
export const dispatchMetaMessage = async ({ toPhone, messageText, mediaType, mediaUrl, mediaFilename }) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  let cleanPhone = (toPhone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Valid phone number with country code is required for WhatsApp dispatch');
  }

  if (token && phoneId && token !== 'placeholder_token') {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: mediaType === 'document' ? 'document' : 'text'
      };

      if (mediaType === 'document') {
        payload.document = {
          link: mediaUrl,
          caption: messageText,
          filename: mediaFilename || 'Document.pdf'
        };
      } else {
        payload.text = {
          preview_url: true,
          body: messageText
        };
      }

      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Meta API error with status ${response.status}`);
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid.${Date.now()}`,
        mode: 'LIVE_META_API',
        response: data
      };
    } catch (err) {
      console.error(`[Meta API Live Dispatch Failed to ${cleanPhone}]:`, err.message);
      throw err;
    }
  }

  // Graceful Simulation & Audit Mode for Development & Testing
  console.log(`\n========== [META WHATSAPP DISPATCH TO: ${cleanPhone}] ==========`);
  if (mediaType === 'document') {
    console.log(`[ATTACHMENT: ${mediaFilename} -> ${mediaUrl}]`);
  }
  console.log(messageText);
  console.log('=================================================================\n');

  return {
    success: true,
    messageId: `wamid.SIMULATED_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    mode: 'SIMULATION_AUDIT',
    sentText: messageText
  };
};

/**
 * Sends portfolio link share message
 */
export const sendWhatsAppMessage = async ({ toPhone, customerName, shareUrl, accessEnd }) => {
  const messageText = 
`✨ *Shraddha Gold India Pvt. Ltd. — Exclusive Jewellery Portfolio* ✨

Dear *${customerName}*,

Your bespoke jewellery catalog and design collections are ready for viewing.

🔗 *Access Link:*
${shareUrl}

⏳ *Access Window Valid Until:* ${accessEnd ? formatDateIST(accessEnd) : 'Authorized Period'}

_Please note: This link contains proprietary B2B CAD specifications & hallmarked collections curated exclusively for your firm._

*Shraddha Gold Manufacturing HQ*
🌐 www.shraddhagold.com`;

  return dispatchMetaMessage({ toPhone, messageText });
};

/**
 * Sends 6-digit checkout OTP to customer's mobile
 */
export const sendOtpWhatsApp = async ({ toPhone, otp }) => {
  const messageText = 
`🔐 *Shraddha Gold India Pvt. Ltd.*

Your verification code for placing your jewellery order is:
👉 *${otp}*

This OTP is valid for 10 minutes. Please do not share this security code with anyone.

*Shraddha Gold Commercial Desk*
🌐 www.shraddhagold.com`;

  return dispatchMetaMessage({ toPhone, messageText });
};

/**
 * Sends Order Confirmation & PDF link to both Customer and Admin
 */
export const sendOrderWhatsAppNotifications = async ({ order, fullPdfUrl }) => {
  const results = { customer: null, admin: null };

  const itemsText = (order.items || [])
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.styleCode}* (${it.kt || '22KT'}) — ${it.quantity || 1} pc(s) | Gross: ${Number(it.grossWeight || 0).toFixed(2)}g`
    )
    .join('\n');

  const notesText = order.notes ? `\n📝 *Notes:* "${order.notes}"\n` : '';

  // 1. Dispatch to Customer
  try {
    const customerMsg = 
`✨ *Shraddha Gold — Order Details* ✨

📋 *Order Number:* ${order.orderNumber}
📅 *Date:* ${formatDateTimeIST(order.createdAt || Date.now())}
👤 *Customer:* ${order.customerName}
📞 *Mobile:* ${order.customerPhone}
📌 *Status:* ${order.status || 'Pending'}

📦 *Order Items:*
${itemsText}

📊 *Summary:*
• Total Designs: ${order.totalItems || order.items?.length || 0}
• Total Pieces: ${order.totalQuantity} pcs
• Gross Weight: ${Number(order.totalGrossWeight || 0).toFixed(2)}g
${notesText}
📄 *Order PDF:*
${fullPdfUrl}`;

    results.customer = await dispatchMetaMessage({
      toPhone: order.customerPhone,
      messageText: customerMsg,
      mediaType: 'document',
      mediaUrl: fullPdfUrl,
      mediaFilename: `Order_${order.orderNumber}.pdf`
    });
  } catch (err) {
    console.error('[WhatsApp Customer Dispatch Error]:', err.message);
    results.customer = { success: false, error: err.message };
  }

  // 2. Dispatch to Admin
  try {
    let adminPhone = '9825012345'; // Fallback

    try {
      const adminUser = await User.findOne({ role: 'admin' }).select('mobile');
      if (adminUser && adminUser.mobile) {
        adminPhone = adminUser.mobile;
      }
    } catch (dbErr) {
      console.error('[WhatsApp Admin Phone Fetch Error]:', dbErr.message);
    }

    const adminMsg = 
`🔔 *Shraddha Gold — New Order Details* 🔔

📋 *Order Number:* ${order.orderNumber}
📅 *Date:* ${formatDateTimeIST(order.createdAt || Date.now())}
👤 *Customer:* ${order.customerName}
📞 *Mobile:* ${order.customerPhone}
📌 *Status:* ${order.status || 'Pending'}

📦 *Order Items:*
${itemsText}

📊 *Summary:*
• Total Designs: ${order.totalItems || order.items?.length || 0}
• Total Pieces: ${order.totalQuantity} pcs
• Gross Weight: ${Number(order.totalGrossWeight || 0).toFixed(2)}g
${notesText}
📄 *Order PDF:*
${fullPdfUrl}`;

    results.admin = await dispatchMetaMessage({
      toPhone: adminPhone,
      messageText: adminMsg,
      mediaType: 'document',
      mediaUrl: fullPdfUrl,
      mediaFilename: `Order_${order.orderNumber}.pdf`
    });
    // Attach the resolved phone to the results so the caller knows who it was sent to
    if (results.admin) {
      results.admin.targetPhone = adminPhone;
    }
  } catch (err) {
    console.error('[WhatsApp Admin Dispatch Error]:', err.message);
    results.admin = { success: false, error: err.message };
  }

  return results;
};
