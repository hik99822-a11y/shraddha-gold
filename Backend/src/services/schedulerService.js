import cron from 'node-cron';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { sendWhatsAppMessage } from './metaApiService.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
            const isRecurring = (ca.shareAfterDays || 0) > 0;
            if (!isRecurring) {
              ca.dispatchStatus = 'Failed';
              customerChanged = true;
              continue;
            }
          }

          const isRecurring = (ca.shareAfterDays || 0) > 0;
          let tokenToSend = ca.shareToken;

          if (isRecurring) {
            const tokenAge = now.getTime() - new Date(ca.shareLinkCreatedAt || 0).getTime();
            if (tokenAge > 5 * 60 * 1000) { // Older than 5 minutes
               ca.shareToken = crypto.randomBytes(16).toString('hex');
               ca.shareLinkCreatedAt = new Date();
               
               const validityDays = !isNaN(parseInt(ca.validityDays, 10)) ? Math.max(1, parseInt(ca.validityDays, 10)) : 1;
               ca.shareLinkExpiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
               tokenToSend = ca.shareToken;
            }
          }

          const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          const token = tokenToSend || customer.shareToken || customer._id.toString();
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
              // Prevent Meta API burst rate-limits (Spam drop)
              await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (err) {
              console.error(`[Scheduler Meta API Error to ${phone}]:`, err.message);
            }
          }

          ca.lastSharedAt = new Date(now);
          if (isRecurring) {
            const nextDispatch = new Date(now);
            nextDispatch.setDate(nextDispatch.getDate() + ca.shareAfterDays);
            if (ca.shareTime && typeof ca.shareTime === 'string' && ca.shareTime.includes(':')) {
              const [h, m] = ca.shareTime.split(':').map((v) => parseInt(v, 10));
              if (!isNaN(h) && !isNaN(m)) nextDispatch.setHours(h, m, 0, 0);
            }
            ca.dispatchScheduledAt = nextDispatch;
            ca.dispatchStatus = 'Pending';
          } else {
            ca.dispatchStatus = 'Sent';
          }
          
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
 * Cleanup orphaned PDF files in uploads directory older than 30 minutes
 * This handles any leftover files in case the node process restarts and drops its in-memory timeouts
 */
export const cleanupOldPdfs = async () => {
  try {
    const uploadsDir = process.env.DESKTOP_SERVER_DIR && fs.existsSync(process.env.DESKTOP_SERVER_DIR)
      ? process.env.DESKTOP_SERVER_DIR
      : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));

    if (!fs.existsSync(uploadsDir)) return;

    const files = await fs.promises.readdir(uploadsDir);
    const now = Date.now();
    const thirtyMins = 30 * 60 * 1000;

    let deletedCount = 0;
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.promises.stat(filePath);
        
        // Delete if older than 30 minutes
        if (now - stats.mtimeMs > thirtyMins) {
          await fs.promises.unlink(filePath).catch(() => {});
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 [Scheduler]: Cleaned up ${deletedCount} orphaned PDF files from uploads directory`);
    }
  } catch (err) {
    console.error('[Scheduler PDF Cleanup Error]:', err);
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
  cleanupOldPdfs(); // Run immediately on startup

  // Run every minute
  cron.schedule('* * * * *', async () => {
    await deactivateExpiredCustomers();
    await executePendingScheduledShares();
  });

  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await cleanupOldPdfs();
  });
};

