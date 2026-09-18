import Style from '../models/Style.js';
import StyleImage from '../models/StyleImage.js';
import Category from '../models/Category.js';
import CategoryGroup from '../models/CategoryGroup.js';
import { matchAndAssignImage } from '../services/imageMatchingService.js';
import { generateStylesPdf } from '../services/pdfGeneratorService.js';
import { syncServerFolderToStyles } from '../utils/syncServerImages.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getActiveKtList, calculateStylePendingKts } from '../utils/ktHelper.js';

/**
 * @desc    Get styles with 18/20/22 KT image slots
 *          Supports filtering by category, categoryGroup, and kt purity.
 *          Returns each StyleCode / Item variant separately for granular image & stock visibility.
 * @route   GET /api/admin/style-images
 * @access  Private (Admin)
 */
export const getStyleImages = async (req, res) => {
  try {
    const { category, categoryGroup, kt, search, page = 1, limit = 20 } = req.query;
    const query = { status: { $in: ['Active', 'Removed from latest stock'] } };

    // 1. Filter by Category Group if specified
    if (categoryGroup && categoryGroup !== 'all') {
      let groupObj = null;
      if (categoryGroup.match(/^[0-9a-fA-F]{24}$/)) {
        groupObj = await CategoryGroup.findById(categoryGroup);
      } else {
        groupObj = await CategoryGroup.findOne({ name: categoryGroup });
      }
      if (groupObj && Array.isArray(groupObj.categoryNames) && groupObj.categoryNames.length > 0) {
        query.categoryName = { $in: groupObj.categoryNames };
      }
    }

    // 2. Filter by Category (overrides or refines categoryGroup)
    if (category && category !== 'all') {
      query.categoryName = category;
    }

    // 3. Filter by KT purity if specified
    if (kt && kt !== 'all') {
      const ktNorm = kt.replace(/\s*KT/i, '').trim();
      const ktRegex = new RegExp(`${ktNorm}\\s*KT|${ktNorm}K|G${ktNorm}`, 'i');
      query.$or = [
        { purity: ktRegex },
        { 'itemVariants.purity': ktRegex },
        { 'itemVariants.item': ktRegex },
        { [`images.${kt.toUpperCase()}.0`]: { $exists: true } }
      ];
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchOr = [
        { styleCode: searchRegex },
        { item: searchRegex },
        { categoryName: searchRegex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    let sort = { categoryName: 1, styleCode: 1 };
    
    if (req.query.filter === 'new') {
      // Query indexed pendingKts array directly: style must have at least 1 KT awaiting photos
      query['pendingKts.0'] = { $exists: true };
      sort = { createdAt: -1 };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Style.countDocuments(query);
    const styles = await Style.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      styles,
      availableKts: await getActiveKtList(),
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[getStyleImages Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch style images', error: error.message });
  }
};

/**
 * @desc    Upload or replace image in a specific KT slot (with optional applyToAllKt)
 * @route   POST /api/admin/style-images/:id/slot
 * @access  Private (Admin)
 */
export const uploadSlotImage = async (req, res) => {
  try {
    const { kt, slot, applyToAllKt } = req.body;
    const targetSlot = parseInt(slot, 10);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    if (!kt || typeof kt !== 'string') {
      return res.status(400).json({ success: false, message: 'KT value is required' });
    }

    if (!targetSlot || targetSlot < 1 || targetSlot > 4) {
      return res.status(400).json({ success: false, message: 'Slot must be between 1 and 4' });
    }

    const cleanId = (req.params.id || '').split('_v')[0];
    const style = await Style.findById(cleanId);
    if (!style) {
      return res.status(404).json({ success: false, message: 'Style not found' });
    }

    if (!style.images) style.images = {};

    const imageUrl = `/uploads/style-images/${req.file.filename}`;
    const slotPayload = {
      slot: targetSlot,
      url: imageUrl,
      originalFileName: req.file.originalname,
      storageKey: req.file.filename,
      uploadedAt: new Date(),
      isRealImage: true,
      source: 'manual_upload'
    };

    const availableKts = await getActiveKtList();
    const shouldApplyAll = applyToAllKt === 'true' || applyToAllKt === true;
    const targetKts = shouldApplyAll ? (availableKts.length > 0 ? availableKts : [kt]) : [kt];

    for (const targetKt of targetKts) {
      if (!style.images[targetKt]) style.images[targetKt] = [];
      const slotIdx = style.images[targetKt].findIndex((s) => s.slot === targetSlot);

      if (slotIdx >= 0) {
        style.images[targetKt][slotIdx] = slotPayload;
      } else {
        style.images[targetKt].push(slotPayload);
      }
      style.images[targetKt].sort((a, b) => a.slot - b.slot);
    }

    style.markModified('images');
    style.pendingKts = calculateStylePendingKts(style);
    await style.save();

    // Sync image across all style documents sharing this styleCode (so separate item entries stay in sync)
    try {
      const matchingStyles = await Style.find({ styleCode: style.styleCode, _id: { $ne: style._id } });
      for (const other of matchingStyles) {
        if (!other.images) other.images = {};
        for (const targetKt of targetKts) {
          if (!other.images[targetKt]) other.images[targetKt] = [];
          const idx = other.images[targetKt].findIndex((s) => s.slot === targetSlot);
          if (idx >= 0) {
            other.images[targetKt][idx] = slotPayload;
          } else {
            other.images[targetKt].push(slotPayload);
          }
          other.images[targetKt].sort((a, b) => a.slot - b.slot);
        }
        other.markModified('images');
        other.pendingKts = calculateStylePendingKts(other);
        await other.save();
      }
    } catch (syncErr) {
      console.warn('[uploadSlotImage] Sync to matching styles warning:', syncErr.message);
    }



    res.status(200).json({
      success: true,
      message: shouldApplyAll
        ? `Image assigned to Slot ${targetSlot} across All K (${targetKts.join(', ')})`
        : `Image assigned to ${kt} Slot ${targetSlot}`,
      style
    });
  } catch (error) {
    console.error('[uploadSlotImage Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to upload slot image', error: error.message });
  }
};

/**
 * @desc    Copy a slot's image across all KTs (18KT, 20KT, 22KT)
 * @route   POST /api/admin/style-images/:id/copy-slot-all
 * @access  Private (Admin)
 */
export const copySlotToAllKt = async (req, res) => {
  try {
    const { sourceKt, slot } = req.body;
    const targetSlot = parseInt(slot, 10);

    const cleanId = (req.params.id || '').split('_v')[0];
    const style = await Style.findById(cleanId);
    if (!style) {
      return res.status(404).json({ success: false, message: 'Style not found' });
    }

    if (!style.images || !style.images[sourceKt]) {
      return res.status(400).json({ success: false, message: `No images found in ${sourceKt}` });
    }

    const sourceImg = style.images[sourceKt].find((s) => s.slot === targetSlot);
    if (!sourceImg) {
      return res.status(400).json({ success: false, message: `No image found in ${sourceKt} Slot ${targetSlot}` });
    }

    const payload = {
      slot: targetSlot,
      url: sourceImg.url,
      originalFileName: sourceImg.originalFileName,
      storageKey: sourceImg.storageKey,
      uploadedAt: new Date(),
      isRealImage: sourceImg.isRealImage !== undefined ? sourceImg.isRealImage : true,
      source: sourceImg.source || 'manual_upload'
    };

    const availableKts = await getActiveKtList();
    const targetKts = availableKts.length > 0 ? availableKts : Object.keys(style.images || {});

    targetKts.forEach((k) => {
      if (!style.images[k]) style.images[k] = [];
      const idx = style.images[k].findIndex((s) => s.slot === targetSlot);
      if (idx >= 0) {
        style.images[k][idx] = payload;
      } else {
        style.images[k].push(payload);
      }
      style.images[k].sort((a, b) => a.slot - b.slot);
    });

    style.markModified('images');
    style.pendingKts = calculateStylePendingKts(style);
    await style.save();

    // Sync to all styles with matching styleCode
    try {
      const matchingStyles = await Style.find({ styleCode: style.styleCode, _id: { $ne: style._id } });
      for (const other of matchingStyles) {
        if (!other.images) other.images = {};
        targetKts.forEach((k) => {
          if (!other.images[k]) other.images[k] = [];
          const idx = other.images[k].findIndex((s) => s.slot === targetSlot);
          if (idx >= 0) {
            other.images[k][idx] = payload;
          } else {
            other.images[k].push(payload);
          }
          other.images[k].sort((a, b) => a.slot - b.slot);
        });
        other.markModified('images');
        other.pendingKts = calculateStylePendingKts(other);
        await other.save();
      }
    } catch (syncErr) {
      console.warn('[copySlotToAllKt] Sync error:', syncErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Image copied to Slot ${targetSlot} across All K (${targetKts.join(', ')})`,
      style
    });
  } catch (error) {
    console.error('[copySlotToAllKt Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to copy image to all KTs', error: error.message });
  }
};

/**
 * @desc    Delete image from a specific KT slot (or all KTs)
 * @route   DELETE /api/admin/style-images/:id/slot
 * @access  Private (Admin)
 */
export const deleteSlotImage = async (req, res) => {
  try {
    const kt = req.body?.kt || req.query?.kt;
    const slot = req.body?.slot || req.query?.slot;
    const deleteAllKt = req.body?.deleteAllKt || req.query?.deleteAllKt;
    const targetSlot = parseInt(slot, 10);

    if (targetSlot === 1) {
      return res.status(400).json({ success: false, message: 'Slot 1 is protected and cannot be deleted' });
    }

    if (!targetSlot || targetSlot < 1 || targetSlot > 4) {
      return res.status(400).json({ success: false, message: 'Valid slot between 2 and 4 is required' });
    }

    const cleanId = (req.params.id || '').split('_v')[0];
    const style = await Style.findById(cleanId);
    if (!style) {
      return res.status(404).json({ success: false, message: 'Style not found' });
    }

    const availableKts = await getActiveKtList();
    const shouldDeleteAll = deleteAllKt === true || deleteAllKt === 'true';
    const targetKts = shouldDeleteAll ? (availableKts.length > 0 ? availableKts : Object.keys(style.images || {})) : [kt];

    // Collect image objects before removal to clean up physical files
    const imagesToClean = [];
    targetKts.forEach((k) => {
      const found = (style.images?.[k] || []).filter((s) => Number(s.slot) === targetSlot);
      found.forEach((img) => imagesToClean.push(img));
    });

    // 1. Direct MongoDB atomic $pull update
    const pullQuery = {};
    targetKts.forEach((k) => {
      pullQuery[`images.${k}`] = { slot: { $in: [targetSlot, String(targetSlot)] } };
    });

    const updatedStyle = await Style.findByIdAndUpdate(
      cleanId,
      { $pull: pullQuery },
      { new: true }
    );

    // Also pull from other matching styles with the same styleCode
    await Style.updateMany(
      { styleCode: style.styleCode, _id: { $ne: cleanId } },
      { $pull: pullQuery }
    );

    // 2. Also remove from StyleImage collection if present
    await StyleImage.deleteMany({
      styleCode: style.styleCode,
      slot: targetSlot,
      ...(shouldDeleteAll ? {} : { kt })
    });

    // 3. Clean up physical upload files if they exist in uploads/style-images/
    imagesToClean.forEach((img) => {
      if (img?.url && img.url.startsWith('/uploads/style-images/')) {
        const fileName = path.basename(img.url);
        const diskPath = path.resolve('uploads/style-images', fileName);
        if (fs.existsSync(diskPath)) {
          try {
            fs.unlinkSync(diskPath);
            console.log(`[deleteSlotImage] Deleted disk file: ${diskPath}`);
          } catch (e) {
            console.warn(`[deleteSlotImage] Failed to delete disk file:`, e.message);
          }
        }
      }
    });

    // 4. Recalculate pendingKts
    let finalStyle = updatedStyle;
    const refreshedStyle = await Style.findById(cleanId);
    if (refreshedStyle) {
      refreshedStyle.pendingKts = calculateStylePendingKts(refreshedStyle);
      await refreshedStyle.save();
      finalStyle = refreshedStyle;
    }
    const matchingStyles = await Style.find({ styleCode: style.styleCode, _id: { $ne: cleanId } });
    for (const other of matchingStyles) {
      other.pendingKts = calculateStylePendingKts(other);
      await other.save();
    }

    res.status(200).json({
      success: true,
      message: shouldDeleteAll
        ? `Image cleared from Slot ${targetSlot} across All K (${targetKts.join(', ')})`
        : `Image cleared from ${kt} Slot ${targetSlot}`,
      style: finalStyle || style
    });
  } catch (error) {
    console.error('[deleteSlotImage Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete slot image', error: error.message });
  }
};

/**
 * @desc    Process chunk of bulk folder image upload
 * @route   POST /api/admin/style-images/bulk-chunk
 * @access  Private (Admin)
 */
export const processBulkImageChunk = async (req, res) => {
  try {
    const files = req.files || [];
    const relativePaths = req.body.relativePaths
      ? (Array.isArray(req.body.relativePaths) ? req.body.relativePaths : [req.body.relativePaths])
      : [];
    const batchId = req.body.batchId || `batch_${Date.now()}`;

    let matchedCount = 0;
    let unmatchedCount = 0;
    let failedCount = 0;
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i] || '';
      const originalFileName = file.originalname;
      const imageUrl = `/uploads/style-images/${file.filename}`;

      try {
        const result = await matchAndAssignImage({
          file,
          originalFileName,
          relativePath,
          batchId,
          storageKey: file.filename,
          imageUrl
        });

        if (result.success && result.status === 'Matched') {
          matchedCount++;
        } else {
          unmatchedCount++;
        }
        results.push(result);
      } catch (err) {
        failedCount++;
        results.push({
          success: false,
          originalFileName,
          error: err.message
        });
      }
    }

    res.status(200).json({
      success: true,
      batchId,
      processed: files.length,
      matchedCount,
      unmatchedCount,
      failedCount,
      results
    });
  } catch (error) {
    console.error('[processBulkImageChunk Error]:', error);
    res.status(500).json({ success: false, message: 'Chunk processing failed', error: error.message });
  }
};

/**
 * @desc    Get unmatched images report
 * @route   GET /api/admin/style-images/unmatched
 * @access  Private (Admin)
 */
export const getUnmatchedImages = async (req, res) => {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const query = { status: 'Unmatched' };

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ originalFileName: regex }, { folderPath: regex }, { errorReason: regex }];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await StyleImage.countDocuments(query);
    const unmatched = await StyleImage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      unmatched,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[getUnmatchedImages Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unmatched images', error: error.message });
  }
};

/**
 * @desc    Generate PDF from Style Images (Category-wise or All Categories)
 *          Supports filtering by Category Group, Categories, and KT purity
 * @route   POST /api/admin/style-images/generate-pdf
 * @access  Private (Admin)
 */
export const generateCatalogPdf = async (req, res) => {
  try {
    const {
      type = 'AllCategories',
      categoryName,
      categories = [],
      categoryIds = [],
      categoryGroup,
      categoryGroups = [],
      kts = [],
      kt,
      categoryKts = {},
      quality = 'original'
    } = req.body;

    const query = {};
    let targetName = 'Complete Master Catalog';

    // 1. Resolve Category Groups if provided
    let groupCatNames = [];
    const grpList = [
      ...(Array.isArray(categoryGroups) ? categoryGroups : []),
      ...(categoryGroup && categoryGroup !== 'all' ? [categoryGroup] : [])
    ].filter(Boolean);

    if (grpList.length > 0) {
      const foundGroups = await CategoryGroup.find({
        $or: [
          { _id: { $in: grpList.filter((id) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) } },
          { name: { $in: grpList } }
        ]
      });
      foundGroups.forEach((g) => {
        if (Array.isArray(g.categoryNames)) groupCatNames.push(...g.categoryNames);
      });
    }

    const combinedCategoryNames = Array.from(new Set([
      ...(Array.isArray(categories) ? categories : []),
      ...groupCatNames
    ])).filter((c) => c && c !== 'All');

    // Handle multiple categories selection directly from Category table / Groups
    if (Array.isArray(categoryIds) && categoryIds.length > 0 && !categoryIds.includes('All')) {
      query.$or = [
        { category: { $in: categoryIds } },
        { categoryName: { $in: combinedCategoryNames } }
      ];
      targetName = combinedCategoryNames.length === 1 ? combinedCategoryNames[0] : `${combinedCategoryNames.length} Selected Categories`;
    } else if (combinedCategoryNames.length > 0) {
      query.categoryName = { $in: combinedCategoryNames };
      targetName = combinedCategoryNames.length === 1 ? combinedCategoryNames[0] : `${combinedCategoryNames.length} Selected Categories`;
    } else if (type === 'Category' && categoryName && categoryName !== 'All') {
      query.categoryName = categoryName;
      targetName = categoryName;
    }

    // Resolve allowed KTs
    let allowedKts = Array.isArray(kts) ? [...kts] : [];
    if (kt && kt !== 'all' && !allowedKts.includes(kt)) {
      allowedKts.push(kt);
    }

    const job = await generateStylesPdf({
      type: query.categoryName || query.$or ? 'Filtered' : 'AllCategories',
      targetName,
      styleQuery: query,
      allowedKts,
      categoryKts,
      quality
    });

    res.status(200).json({
      success: true,
      message: 'Catalog PDF generated successfully',
      job
    });
  } catch (error) {
    console.error('[generateCatalogPdf Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
  }
};

/**
 * @desc    Sync images from local Desktop/server folder directly to styles without manual upload
 * @route   POST /api/admin/style-images/sync-server-folder
 * @access  Private (Admin)
 */
export const syncDesktopServerImages = async (req, res) => {
  try {
    const targetDir = req.body.folderPath || process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';
    const result = await syncServerFolderToStyles(targetDir);

    res.status(200).json({
      success: true,
      message: `Successfully processed ${result.totalScanned} images (${result.matchedCount} matched & updated in database)`,
      ...result
    });
  } catch (error) {
    console.error('[syncDesktopServerImages Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync server images',
      error: error.message
    });
  }
};
