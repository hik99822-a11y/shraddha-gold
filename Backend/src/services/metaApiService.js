/**
 * Meta Cloud API (WhatsApp Business Graph API) Service
 */
import User from '../models/User.js';
import { formatDateIST, formatDateTimeIST } from '../utils/dateUtils.js';

/**
 * Generic WhatsApp message dispatcher (handles Live Meta API or graceful development simulation)
 */
export const dispatchMetaMessage = async ({ toPhone, messageText, mediaType, mediaUrl, mediaFilename, templateName, templateData, languageCode = 'en' }) => {
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
        type: templateName ? 'template' : (mediaType === 'document' ? 'document' : 'text')
      };

      if (templateName) {
        const components = [];
        
        if (mediaType === 'document' && mediaUrl) {
          components.push({
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: {
                  link: mediaUrl,
                  filename: mediaFilename || 'Document.pdf'
                }
              }
            ]
          });
        }
        
        if (templateData && templateData.length > 0) {
          components.push({
            type: 'body',
            parameters: templateData.map(text => ({ type: 'text', text: String(text) }))
          });
        }

        payload.template = {
          name: templateName,
          language: { code: languageCode },
          components: components
        };
      } else if (mediaType === 'document') {
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

      const response = await fetch(`https://graph.facebook.com/v26.0/${phoneId}/messages`, {
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
  if (templateName) {
    console.log(`[TEMPLATE: ${templateName}] Variables: ${JSON.stringify(templateData)}`);
  } else if (mediaType === 'document') {
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
export const sendWhatsAppMessage = async ({ toPhone, customerName, shareUrl, accessEnd, mediaType, mediaUrl, mediaFilename }) => {
  const messageText = 
`Dear ${customerName},

Your design is available at the link below:

${shareUrl}

Thank you,
SHRADDHA GOLDS INDIA PVT LTD`;

  return dispatchMetaMessage({ 
    toPhone, 
    messageText,
    mediaType,
    mediaUrl,
    mediaFilename,
    templateName: 'portfolio_link_share',
    templateData: [customerName, shareUrl],
    languageCode: 'en_US'
  });
};

export const sendOtpWhatsApp = async ({ toPhone, otp }) => {
  const messageText = 
`Your verification code is ${otp}.

This code is valid for 5 minutes. Please do not share it with anyone.

SHRADDHA GOLDS INDIA PVT LTD`;

  return dispatchMetaMessage({ 
    toPhone, 
    messageText,
    templateName: 'checkout_otp',
    templateData: [otp]
  });
};

/**
 * Sends Order Confirmation & PDF link to both Customer and Admin
 */
export const sendOrderWhatsAppNotifications = async ({ order, fullPdfUrl }) => {
  const results = { customer: null, admin: null };

  const itemsText = (order.items || [])
    .map((it) => `Style: ${it.styleCode} | KT: ${it.kt || '22K'} | Qty: ${it.quantity || 1}`)
    .join('  ---  ');

  const baseMessage = 
`*New Order Placed*

Business Name: ${order.customerName || 'N/A'}
Contact Name: ${order.orderedBy || order.customerName || 'N/A'}
Contact Number: ${order.customerPhone || 'N/A'}

${itemsText}`;

  // 1. Dispatch to Customer
  try {
    let customerPhones = [order.customerPhone].filter(Boolean);
    
    // Fetch all customer phones if linked to a Customer account
    if (order.customer) {
      try {
        const Customer = (await import('../models/Customer.js')).default;
        const custDoc = await Customer.findById(order.customer).select('phones');
        if (custDoc && Array.isArray(custDoc.phones) && custDoc.phones.length > 0) {
          customerPhones = custDoc.phones;
        }
      } catch (dbErr) {
        console.error('[WhatsApp Customer Phone Fetch Error]:', dbErr.message);
      }
    }

    results.customer = [];
    for (const phone of customerPhones) {
      if (!phone) continue;
      try {
        const res = await dispatchMetaMessage({
          toPhone: phone,
          messageText: baseMessage,
          templateName: 'order_confirmation',
          templateData: [
            order.customerName || 'N/A', 
            order.orderedBy || order.customerName || 'N/A', 
            order.customerPhone || 'N/A', 
            itemsText
          ]
        });
        res.targetPhone = phone;
        results.customer.push(res);
      } catch (dispatchErr) {
        console.error(`[WhatsApp Customer Dispatch Error to ${phone}]:`, dispatchErr.message);
        results.customer.push({ success: false, targetPhone: phone, error: dispatchErr.message });
      }
    }
  } catch (err) {
    console.error('[WhatsApp Customer Processing Error]:', err.message);
    results.customer = { success: false, error: err.message };
  }

  // 2. Dispatch to Admin
  try {
    let adminPhones = []; // Only fetch from DB

    try {
      const adminUser = await User.findOne({ role: 'admin' }).select('mobile');
      if (adminUser && Array.isArray(adminUser.mobile) && adminUser.mobile.length > 0) {
        adminPhones = adminUser.mobile;
      }
    } catch (dbErr) {
      console.error('[WhatsApp Admin Phone Fetch Error]:', dbErr.message);
    }

    results.admin = [];
    for (const phone of adminPhones) {
      if (!phone) continue;
      try {
        const res = await dispatchMetaMessage({
          toPhone: phone,
          messageText: baseMessage,
          templateName: 'order_confirmation',
          templateData: [
            order.customerName || 'N/A', 
            order.orderedBy || order.customerName || 'N/A', 
            order.customerPhone || 'N/A', 
            itemsText
          ]
        });
        res.targetPhone = phone;
        results.admin.push(res);
      } catch (dispatchErr) {
        console.error(`[WhatsApp Admin Dispatch Error to ${phone}]:`, dispatchErr.message);
        results.admin.push({ success: false, targetPhone: phone, error: dispatchErr.message });
      }
    }
  } catch (err) {
    console.error('[WhatsApp Admin Processing Error]:', err.message);
    results.admin = { success: false, error: err.message };
  }

  return results;
};
