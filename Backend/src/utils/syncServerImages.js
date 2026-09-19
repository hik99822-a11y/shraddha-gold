import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Style from '../models/Style.js';
import StyleImage from '../models/StyleImage.js';
import { calculateStylePendingKts } from './ktHelper.js';

dotenv.config();

const DEFAULT_SERVER_DIR = process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';

/**
 * Recursively find all image files under any arbitrary folder hierarchy.
 * Handles single folder, multiple folders, deep nested folders, etc.
 */
export const getAllImageFiles = (dir, rootDir = dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Ignore hidden files and system artifacts (.DS_Store, Thumbs.db, etc.)
      if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'thumbs.db') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results = results.concat(getAllImageFiles(fullPath, rootDir));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
          const relativePath = path.relative(rootDir, fullPath);
          const stat = fs.statSync(fullPath);
          results.push({
            fullPath,
            relativePath,
            filename: entry.name,
            ext,
            size: stat.size
          });
        }
      }
    }
  } catch (err) {
    console.error(`[getAllImageFiles Error on ${dir}]:`, err.message);
  }

  return results;
};

/**
 * Helper to escape characters for RegExp
 */
export const escapeRegExp = (string) => {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extract clean StyleCode, KT purity, and Slot candidate from image filename
 * E.g., "ANS0077.jpeg" -> styleCode: "ANS0077", slot: null
 *       "TN LB01.jpeg" -> styleCode: "TN LB01", slot: null
 *       "TNLB01.jpeg" -> styleCode: "TNLB01", slot: null
 *       "ALB00607_18KT_3.png" -> styleCode: "ALB00607", kt: "18KT", slot: 3
 *       "BLB00350 (1).jpeg" -> styleCode: "BLB00350", slot: 1
 */
export const extractMetadataFromFilename = (filename) => {
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext).trim();

  // 1. Detect KT purity
  let detectedKT = null;
  if (/(?:^|[_\-\s])18\s*K(?:T)?(?:[_\-\s]|$)/i.test(baseName)) {
    detectedKT = '18KT';
  } else if (/(?:^|[_\-\s])20\s*K(?:T)?(?:[_\-\s]|$)/i.test(baseName)) {
    detectedKT = '20KT';
  } else if (/(?:^|[_\-\s])22\s*K(?:T)?(?:[_\-\s]|$)/i.test(baseName)) {
    detectedKT = '22KT';
  }

  // 2. Detect Slot (1..4)
  let detectedSlot = null;
  const slotMatch =
    baseName.match(/[_\-\s]+0?([1-4])$/i) ||
    baseName.match(/\s*\(([1-4])\)$/i) ||
    baseName.match(/[_\-\s]+0?([1-4])[_\-\s]+/i);

  if (slotMatch && slotMatch[1]) {
    detectedSlot = parseInt(slotMatch[1], 10);
  }

  // 3. Extract clean styleCode candidate
  let cleaned = baseName
    .replace(/(?:18|20|22)\s*K(?:T)?/gi, '')
    .replace(/[_\-\s]+0?[1-4]$/i, '')
    .replace(/\s*\([1-4]\)$/i, '')
    .replace(/[_\-\s]+0?[1-4](?=[_\-\s])/i, '')
    .replace(/[_\-\s]+$/, '')
    .trim();

  return {
    rawStyleCode: cleaned.toUpperCase(),
    detectedKT,
    detectedSlot
  };
};

export const extractStyleCode = (filename) => {
  return extractMetadataFromFilename(filename).rawStyleCode;
};

/**
 * Process a given payload of image files and sync them to MongoDB Style records.
 * Can be called with files scanned locally or sent via a remote agent payload.
 */
export const syncImagesFromPayload = async (imageFiles = []) => {
  let matchedCount = 0;
  let updatedCount = 0;
  let unmatchedCount = 0;
  const matchedDetails = [];
  const unmatchedDetails = [];

  for (const file of imageFiles) {
    try {
      const { rawStyleCode, detectedKT, detectedSlot } = extractMetadataFromFilename(file.filename);
      const relativeUrlPath = file.relativePath.split(path.sep).join('/');
      const imageUrl = `/server-images/${relativeUrlPath}`;

      // Helper to check if a slot contains a real/manually uploaded image
      const isManualUploadedImage = (slot) => {
        if (!slot) return false;
        if (slot.isRealImage === true) return true;
        if (slot.source === 'manual_upload' || slot.source === 'upload') return true;
        if (typeof slot.url === 'string' && (slot.url.startsWith('/uploads/') || slot.url.includes('/uploads/style-images/'))) {
          return true;
        }
        return false;
      };

      // Match Styles in MongoDB (find all entries matching styleCode so all variants receive images)
      let styles = [];

      if (rawStyleCode) {
        // 1. Exact match
        styles = await Style.find({ styleCode: rawStyleCode });

        // 2. Case-insensitive exact match
        if (styles.length === 0) {
          styles = await Style.find({
            styleCode: new RegExp(`^${escapeRegExp(rawStyleCode)}$`, 'i')
          });
        }

        // 3. Normalized match (ignoring spaces, hyphens, and underscores)
        if (styles.length === 0) {
          const stripped = rawStyleCode.replace(/[^A-Z0-9]/g, '');
          if (stripped.length > 0) {
            const regexPattern = `^${stripped.split('').map(escapeRegExp).join('[\\s_\\-]*')}$`;
            styles = await Style.find({
              styleCode: new RegExp(regexPattern, 'i')
            });
          }
        }

        // 4. Prefix match (e.g. styleCode 'ALB00607' matching 'ALB00607-A' or root)
        if (styles.length === 0) {
          const prefix = rawStyleCode.split(/[_\-\s]/)[0];
          if (prefix && prefix !== rawStyleCode && prefix.length >= 3) {
            styles = await Style.find({
              styleCode: new RegExp(`^${escapeRegExp(prefix)}$`, 'i')
            });
          }
        }
      }

      if (styles.length === 0) {
        unmatchedCount++;
        unmatchedDetails.push({
          file: file.relativePath,
          candidateCode: rawStyleCode || file.filename,
          reason: `StyleCode '${rawStyleCode || file.filename}' does not exist in master stock`
        });

        // Track in StyleImage collection as Unmatched
        await StyleImage.findOneAndUpdate(
          { originalFileName: file.filename, folderPath: path.dirname(file.relativePath) },
          {
            originalFileName: file.filename,
            folderPath: path.dirname(file.relativePath),
            styleCode: rawStyleCode || '',
            status: 'Unmatched',
            errorReason: `StyleCode '${rawStyleCode || file.filename}' does not exist in master stock`,
            imageUrl,
            storageKey: file.relativePath,
            fileSize: file.size
          },
          { upsert: true, new: true }
        );
        continue;
      }

      // Styles were found!
      matchedCount++;

      for (const style of styles) {
        let finalKT = detectedKT;
        if (!finalKT) {
          if (style.purity && /18/i.test(style.purity)) finalKT = '18KT';
          else if (style.purity && /20/i.test(style.purity)) finalKT = '20KT';
          else finalKT = '22KT';
        }

        if (!style.images) {
          style.images = { '18KT': [], '20KT': [], '22KT': [] };
        }

        const ktsToUpdate = detectedKT ? [detectedKT] : ['18KT', '20KT', '22KT'];
        let lastTargetSlot = detectedSlot || 1;

        ktsToUpdate.forEach((k) => {
          if (!style.images[k]) style.images[k] = [];

          const currentSlots = style.images[k] || [];
          const slot1 = currentSlots.find((s) => s.slot === 1);
          const isSlot1Real = isManualUploadedImage(slot1);

          // Determine target slot (1..4)
          let targetSlot = detectedSlot;

          if (!targetSlot) {
            // Check if this specific file is already assigned to a slot in k
            const existingSlotForFile = currentSlots.find(
              (s) => s.originalFileName === file.filename || s.url === imageUrl
            );

            if (existingSlotForFile) {
              if (existingSlotForFile.slot === 1 && isSlot1Real && !isManualUploadedImage(existingSlotForFile)) {
                // If it was previously in slot 1 before a real image was uploaded, shift CAD to next free slot
                targetSlot = [2, 3, 4].find((s) => !currentSlots.some((cs) => cs.slot === s && isManualUploadedImage(cs))) || 2;
              } else {
                targetSlot = existingSlotForFile.slot;
              }
            } else {
              // If Slot 1 already has a real uploaded image, PRESERVE IT and find next available slot 2..4
              if (isSlot1Real) {
                targetSlot = [2, 3, 4].find((s) => !currentSlots.some((cs) => cs.slot === s && isManualUploadedImage(cs))) || 2;
              } else {
                const usedSlots = new Set(currentSlots.map((s) => s.slot));
                if (!usedSlots.has(1)) {
                  targetSlot = 1;
                } else {
                  targetSlot = [1, 2, 3, 4].find((s) => !usedSlots.has(s)) || 1;
                }
              }
            }
          } else if (targetSlot === 1 && isSlot1Real) {
            // Explicit slot 1 requested by filename, but Slot 1 has a real uploaded image!
            // Keep the real uploaded image in Slot 1 and place the CAD image in Slot 2
            targetSlot = [2, 3, 4].find((s) => !currentSlots.some((cs) => cs.slot === s && isManualUploadedImage(cs))) || 2;
          }

          // Verify chosen target slot is not an uploaded real image
          const existingTargetSlot = currentSlots.find((s) => s.slot === targetSlot);
          if (isManualUploadedImage(existingTargetSlot)) {
            const altSlot = [1, 2, 3, 4].find((s) => !currentSlots.some((cs) => cs.slot === s && isManualUploadedImage(cs)));
            if (altSlot) {
              targetSlot = altSlot;
            } else {
              return; // All slots have real uploaded photos, preserve all of them
            }
          }

          const slotPayload = {
            slot: targetSlot,
            url: imageUrl,
            originalFileName: file.filename,
            storageKey: file.relativePath,
            uploadedAt: new Date(),
            isRealImage: false,
            source: 'desktop_sync'
          };

          const idx = style.images[k].findIndex((s) => s.slot === targetSlot);
          if (idx >= 0) {
            style.images[k][idx] = slotPayload;
          } else {
            style.images[k].push(slotPayload);
          }
          style.images[k].sort((a, b) => a.slot - b.slot);
          
          lastTargetSlot = targetSlot;
        });

        style.markModified('images');
        style.pendingKts = calculateStylePendingKts(style);
        await style.save();
        updatedCount++;

        // Record in StyleImage collection as Matched
        await StyleImage.findOneAndUpdate(
          { styleCode: style.styleCode, slot: lastTargetSlot },
          {
            originalFileName: file.filename,
            folderPath: path.dirname(file.relativePath),
            styleCode: style.styleCode,
            kt: finalKT || '',
            slot: lastTargetSlot,
            imageUrl,
            storageKey: file.relativePath,
            fileSize: file.size,
            status: 'Matched',
            errorReason: ''
          },
          { upsert: true, new: true }
        );

        matchedDetails.push({
          styleCode: style.styleCode,
          categoryName: style.categoryName,
          purity: style.purity,
          imageUrl,
          slot: lastTargetSlot,
          file: file.relativePath
        });

        console.log(`✅ Matched [${style.styleCode}] (${style.categoryName}) Slot ${lastTargetSlot} ➔ ${imageUrl}`);
      }
    } catch (fileErr) {
      console.error(`[SyncServerImages Error on ${file.relativePath}]:`, fileErr);
      unmatchedCount++;
      unmatchedDetails.push({
        file: file.relativePath,
        candidateCode: file.filename,
        reason: fileErr.message || 'Error processing file'
      });
    }
  }

  return {
    success: true,
    totalScanned: imageFiles.length,
    matchedCount,
    updatedCount,
    unmatchedCount,
    matchedDetails,
    unmatchedDetails
  };
};

/**
 * Sync all images from local server folder directly into MongoDB Style records
 */
export const syncServerFolderToStyles = async (serverDir = DEFAULT_SERVER_DIR) => {
  console.log(`\n🔍 [SyncServerImages]: Scanning folder: ${serverDir}`);

  if (!fs.existsSync(serverDir)) {
    throw new Error(`Directory does not exist: ${serverDir}`);
  }

  const imageFiles = getAllImageFiles(serverDir);
  console.log(`📁 Found ${imageFiles.length} image files across all subfolders.`);

  return await syncImagesFromPayload(imageFiles);
};

// Standalone execution handler
if (process.argv[1] && process.argv[1].endsWith('syncServerImages.js')) {
  (async () => {
    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold';
      console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      console.log(' Connected to database.');

      const targetDir = process.argv[2] || DEFAULT_SERVER_DIR;
      const result = await syncServerFolderToStyles(targetDir);

      console.log('\n===========================================');
      console.log('🎉 [Sync Complete Summary]:');
      console.log(`- Total Image Files Scanned: ${result.totalScanned}`);
      console.log(`- Matched Style Codes:       ${result.matchedCount}`);
      console.log(`- Updated in Database:       ${result.updatedCount}`);
      console.log(`- Unmatched Files:           ${result.unmatchedCount}`);
      console.log('===========================================\n');

      if (result.matchedDetails.length > 0) {
        console.log('📸 Matched Styles:');
        result.matchedDetails.forEach((m, idx) => {
          console.log(`  ${idx + 1}. ${m.styleCode.padEnd(12)} | Slot ${m.slot} | ${(m.categoryName || '').padEnd(20)} | ${m.imageUrl}`);
        });
      }

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('❌ Sync failed:', err);
      process.exit(1);
    }
  })();
}

export default syncServerFolderToStyles;
