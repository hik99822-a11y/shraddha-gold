import cron from 'node-cron';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { sendWhatsAppMessage } from './metaApiService.js';

let isProcessing = false;

/**
 * Automatically identifies and deactivates any active customer accounts whose Access End Date & Time has expired.
 * Also deactivates any linked User login accounts.
 */
export const deactivateExpiredCustomers = async () => {
  try {
    const now = new Date();
    const expiredCustomers = await Customer.find({
      status: 'Active',
      accessEnd: { $lte: now }
    }).select('_id name accessEnd user');

    if (expiredCustomers.length > 0) {
      const expiredIds = expiredCustomers.map((c) => c._id);
      const userIds = expiredCustomers.map((c) => c.user).filter(Boolean);

      // Deactivate customer accounts
      const customerUpdateRes = await Customer.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'Inactive' } }
      );

      // Deactivate linked user login accounts
      if (userIds.length > 0) {
        await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: false } }
        );
      }

      console.log(
        `⏰ [Scheduler]: Automatically deactivated ${customerUpdateRes.modifiedCount} expired customer account(s) (${expiredCustomers.map((c) => c.name).join(', ')})`
      );
    }
  } catch (err) {
    console.error('[Scheduler Expiry Deactivation Error]:', err);
  }
};

import { generateStylesPdf } from './pdfGeneratorService.js';

/**
 * Executes pending scheduled Meta WhatsApp sharing directly on Customer categoryAccess
 */
export const executePendingScheduledShares = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();
    // Find customers with pending shares due in their categoryAccess
    const pendingCustomers = await Customer.find({
      'categoryAccess.dispatchStatus': 'Pending',
      'categoryAccess.dispatchScheduledAt': { $lte: now }
    });

    for (const customer of pendingCustomers) {
      let customerChanged = false;

      // Validate customer status and access window
      if (customer.status !== 'Active' || (customer.accessEnd && new Date(customer.accessEnd) < now)) {
        // Mark all pending as failed
        customer.categoryAccess.forEach(ca => {
          if (ca.dispatchStatus === 'Pending') {
            ca.dispatchStatus = 'Failed';
          }
        });
        await customer.save();
        continue;
      }

      for (const ca of customer.categoryAccess) {
        if (ca.dispatchStatus !== 'Pending' || !ca.dispatchScheduledAt || new Date(ca.dispatchScheduledAt) > now) {
          continue;
        }

        try {
          if (ca.shareLinkExpiresAt && new Date(ca.shareLinkExpiresAt) < now) {
            ca.dispatchStatus = 'Failed';
            customerChanged = true;
            continue;
          }

          const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          const token = ca.shareToken || customer.shareToken || customer._id.toString();
          const shareUrl = `${clientUrl}/shared/${token}`;
          
          let mediaType = 'text';
          let mediaUrl = '';
          let mediaFilename = '';

          if (ca.shareFormat === 'PDF') {
            // Generate PDF for this specific category
            const job = await generateStylesPdf({
              type: 'Customer',
              targetId: customer._id.toString(),
              targetName: `${customer.businessName || customer.name} - ${ca.categoryName} Portfolio`,
              styleQuery: {
                categoryName: ca.categoryName
              },
              allowedKts: Array.isArray(ca.kts) && ca.kts.length > 0 ? ca.kts : []
            });
            mediaType = 'document';
            mediaUrl = `${clientUrl}${job.fileUrl}`;
            mediaFilename = `${ca.categoryName.replace(/\\s+/g, '_')}_Portfolio.pdf`;
          }

          const phonesToSend = Array.isArray(customer.phones) && customer.phones.length > 0 
            ? customer.phones 
            : [];

          for (const phone of phonesToSend) {
            if (!phone) continue;
            try {
              await sendWhatsAppMessage({
                toPhone: phone,
                customerName: customer.name,
                shareUrl,
                accessEnd: ca.shareLinkExpiresAt || customer.accessEnd,
                mediaType,
                mediaUrl,
                mediaFilename
              });
            } catch (err) {
              console.error(`[Scheduler Meta API Error to ${phone}]:`, err.message);
            }
          }

          ca.dispatchStatus = 'Sent';
          customerChanged = true;
          console.log(`[Scheduler]: Successfully sent scheduled share (${ca.categoryName}) to ${customer.name} (Phones: ${phonesToSend.join(', ')})`);
        } catch (jobErr) {
          console.error(`[Scheduler Error for Customer ${customer.name} - Cat: ${ca.categoryName}]:`, jobErr.message);
          ca.dispatchStatus = 'Failed';
          customerChanged = true;
        }
      }

      if (customerChanged) {
        await customer.save();
      }
    }
  } catch (err) {
    console.error('[Scheduler Execution Error]:', err);
  } finally {
    isProcessing = false;
  }
};

/**
 * Start cron worker to run every minute
 */
export const startScheduler = () => {
  console.log('⏰ [Scheduler Worker]: Initialized (running every 60 seconds)');
  // Run immediate deactivation and share check on startup
  deactivateExpiredCustomers();
  executePendingScheduledShares();

  cron.schedule('* * * * *', async () => {
    await deactivateExpiredCustomers();
    await executePendingScheduledShares();
  });
};

