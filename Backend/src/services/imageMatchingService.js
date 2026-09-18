import path from 'path';
import Style from '../models/Style.js';
import StyleImage from '../models/StyleImage.js';
import { extractKtFromItem, calculateStylePendingKts } from '../utils/ktHelper.js';

/**
 * Parses filename and relative folder path to extract:
 * - StyleCode candidate
 * - KT purity candidate ('18KT' | '20KT' | '22KT')
 * - Slot candidate (1..4)
 */
export const parseImageMetadata = (originalFileName, relativePath = '') => {
  const ext = path.extname(originalFileName);
  const baseName = path.basename(originalFileName, ext);
  const fullContext = `${relativePath}/${baseName}`.toUpperCase();

  // 1. Determine KT purity dynamically
  let detectedKT = extractKtFromItem(fullContext);

  // 2. Determine Slot (1 to 4)
  let detectedSlot = 1;
  const slotMatch = baseName.match(/(?:[_\-\s])(?:0?([1-4]))$/i) ||
                    baseName.match(/(?:[_\-\s])([1-4])(?:[_\-\s])/i) ||
                    fullContext.match(/(?:IMAGE|SLOT|IMG|PHOTO)[_\-\s]*0?([1-4])/i);

  if (slotMatch && slotMatch[1]) {
    detectedSlot = parseInt(slotMatch[1], 10);
  }

  // 3. Extract StyleCode candidate
  // Typical patterns: "ST1001_18K_1" -> "ST1001", "RNG-502-22KT" -> "RNG-502" or "ABC123"
  // Remove dynamic KT substrings and trailing slot numbers to find root styleCode
  let cleaned = baseName
    .replace(/(?:^|\b|[_\-\s])(?:G)?\d{1,2}\s*K(?:T)?\b/gi, '')
    .replace(/[_\-\s]+0?[1-4]$/, '')
    .replace(/[_\-\s]+0?[1-4](?=[_\-\s])/, '')
    .replace(/[_\-\s]+$/, '')
    .trim();

  // Clean candidate: letters, numbers, hyphens
  const candidate = cleaned.toUpperCase().replace(/[^A-Z0-9_-]/g, '');

  return {
    candidate,
    detectedKT,
    detectedSlot,
    baseName
  };
};

/**
 * Match image against database Style records and assign to slot
 */
export const matchAndAssignImage = async ({
  file,
  originalFileName,
  relativePath,
  batchId,
  storageKey,
  imageUrl
}) => {
  const { candidate, detectedKT, detectedSlot } = parseImageMetadata(originalFileName, relativePath);

  if (!candidate) {
    const unmatched = await StyleImage.create({
      originalFileName,
      folderPath: relativePath,
      status: 'Unmatched',
      errorReason: 'Could not extract valid StyleCode candidate from filename',
      batchId,
      fileSize: file?.size || 0
    });
    return { success: false, status: 'Unmatched', reason: unmatched.errorReason };
  }

const escapeRegExp = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

  // Look up Styles by exact styleCode or regex match (multiple item variants may exist)
  let styles = await Style.find({ styleCode: candidate });
  if (!styles || styles.length === 0) {
    const escaped = escapeRegExp(candidate);
    const prefix = candidate.split(/[-_]/)[0];
    const stripped = candidate.replace(/[^A-Z0-9]/g, '');

    const orConditions = [
      { styleCode: new RegExp(`^${escaped}$`, 'i') }
    ];

    if (prefix && prefix !== candidate && prefix.length >= 3) {
      orConditions.push({ styleCode: prefix });
    }

    if (stripped.length > 0) {
      const normalizedPattern = `^${stripped.split('').map(escapeRegExp).join('[\\s_\\-]*')}$`;
      orConditions.push({ styleCode: new RegExp(normalizedPattern, 'i') });
    }

    styles = await Style.find({ $or: orConditions });
  }

  if (!styles || styles.length === 0) {
    const unmatched = await StyleImage.create({
      originalFileName,
      folderPath: relativePath,
      styleCode: candidate,
      status: 'Unmatched',
      errorReason: `StyleCode '${candidate}' does not exist in master stock`,
      batchId,
      fileSize: file?.size || 0
    });
    return {
      success: false,
      status: 'Unmatched',
      styleCode: candidate,
      reason: unmatched.errorReason
    };
  }

  const primaryStyle = styles[0];

  // Determine KT (fallback to primary style purity or item)
  let finalKT = detectedKT;
  if (!finalKT) {
    finalKT = extractKtFromItem(primaryStyle.purity || primaryStyle.item || '') || '22KT';
  }

  // Find slot index or next available slot
  let targetSlot = detectedSlot;
  if (targetSlot < 1 || targetSlot > 4) targetSlot = 1;

  const slotData = {
    slot: targetSlot,
    url: imageUrl,
    originalFileName,
    storageKey: storageKey || file?.filename || '',
    uploadedAt: new Date()
  };

  // Assign image across all matching style entries/variants
  for (const style of styles) {
    if (!style.images) {
      style.images = {};
    }
    if (!style.images[finalKT]) {
      style.images[finalKT] = [];
    }

    const existingSlotIdx = style.images[finalKT].findIndex((s) => s.slot === targetSlot);
    if (existingSlotIdx >= 0) {
      style.images[finalKT][existingSlotIdx] = slotData;
    } else {
      if (style.images[finalKT].length < 4) {
        style.images[finalKT].push(slotData);
      } else {
        style.images[finalKT][0] = slotData;
      }
    }
    style.images[finalKT].sort((a, b) => a.slot - b.slot);
    style.markModified('images');
    style.pendingKts = calculateStylePendingKts(style);
    await style.save();
  }

  const style = primaryStyle;

  // Log matched StyleImage record
  await StyleImage.create({
    originalFileName,
    folderPath: relativePath,
    styleCode: style.styleCode,
    kt: finalKT,
    slot: targetSlot,
    imageUrl,
    storageKey: storageKey || file?.filename || '',
    status: 'Matched',
    batchId,
    fileSize: file?.size || 0
  });

  return {
    success: true,
    status: 'Matched',
    styleCode: style.styleCode,
    kt: finalKT,
    slot: targetSlot,
    imageUrl
  };
};
