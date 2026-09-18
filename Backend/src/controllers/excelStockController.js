import Category from '../models/Category.js';
import CategoryGroup from '../models/CategoryGroup.js';
import Customer from '../models/Customer.js';
import ExcelImport from '../models/ExcelImport.js';
import Order from '../models/Order.js';
import Style from '../models/Style.js';
import StyleImage from '../models/StyleImage.js';
import { processExcelFile, findColumnMappings } from '../services/excelParserService.js';
import { getActiveKtList, extractKtFromItem } from '../utils/ktHelper.js';
import fs from 'fs';
import path from 'path';

/**
 * Helper to detect StyleCode key in dynamic row
 */
const getRowStyleCode = (row) => {
  if (!row || typeof row !== 'object') return null;
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(stylecode|styleno|style|itemcode|itemno|designno|designcode|modelno|modelcode|barcode|tagno)$/.test(norm)) {
      if (row[key]) return String(row[key]).trim().toUpperCase();
    }
  }
  return null;
};

/**
 * Helper to detect Category key in dynamic row
 */
const getRowCategoryName = (row) => {
  if (!row || typeof row !== 'object') return null;
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(category|categoryname|cat|catname|itemcategory|itemgroup|group|collection|department|type|family)$/.test(norm)) {
      if (row[key]) return String(row[key]).trim();
    }
  }
  return null;
};

/**
 * Completely purge all data related to specific style codes or an Excel import from EVERY table:
 * 1. Style (styles table) - styles permanently deleted
 * 2. StyleImage (styleimages table) - images permanently deleted
 * 3. Category (categories table) - empty categories permanently deleted
 * 4. CategoryGroup (categorygroups table) - groups containing deleted categories or empty groups permanently deleted
 * 5. Customer (customers table) - assignedCategories pulled
 * 6. Order (orders table) - dangling style reference unset
 */
const purgeExcelRelatedData = async ({ importId, styleCodes = [] }) => {
  const validCodes = [...new Set(styleCodes.filter(Boolean))];

  // If importId is provided, also collect style codes and category names directly from the ExcelImport document
  let excelCatNames = [];
  if (importId) {
    try {
      const impDoc = await ExcelImport.findById(importId);
      if (impDoc && Array.isArray(impDoc.data)) {
        for (const row of impDoc.data) {
          const sc = getRowStyleCode(row);
          if (sc && !validCodes.includes(sc)) {
            validCodes.push(sc);
          }
          const cat = getRowCategoryName(row);
          if (cat) {
            excelCatNames.push(cat.trim());
          }
        }
      }
    } catch (docErr) {
      console.warn('[purgeExcelRelatedData: impDoc fetch notice]:', docErr.message);
    }
  }

  // 1. Find all styles that match these style codes or importId
  const styleQuery = {};
  if (importId && validCodes.length > 0) {
    styleQuery.$or = [
      { lastExcelImportId: importId },
      { lastExcelImportId: String(importId) },
      { styleCode: { $in: validCodes } }
    ];
  } else if (importId) {
    styleQuery.$or = [
      { lastExcelImportId: importId },
      { lastExcelImportId: String(importId) }
    ];
  } else if (validCodes.length > 0) {
    styleQuery.styleCode = { $in: validCodes };
  } else {
    return;
  }

  const stylesToDelete = await Style.find(styleQuery).select('_id category categoryName styleCode images');

  const styleIds = stylesToDelete.map((s) => s._id);
  const allTargetCodes = [...new Set([...validCodes, ...stylesToDelete.map((s) => s.styleCode)])];
  const affectedCatIds = [...new Set(stylesToDelete.map((s) => s.category?.toString()).filter(Boolean))];
  const affectedCatNames = [
    ...new Set([
      ...stylesToDelete.map((s) => s.categoryName?.trim().toLowerCase()).filter(Boolean),
      ...excelCatNames.map((c) => c.toLowerCase())
    ])
  ];

  // Also query Category collection for any categories matching affectedCatNames
  if (affectedCatNames.length > 0) {
    try {
      const catDocs = await Category.find({
        $or: [
          { normalizedName: { $in: affectedCatNames } },
          { name: { $in: affectedCatNames.map((n) => new RegExp(`^${n}$`, 'i')) } }
        ]
      }).select('_id name');
      for (const c of catDocs) {
        if (!affectedCatIds.includes(c._id.toString())) {
          affectedCatIds.push(c._id.toString());
        }
      }
    } catch (catQueryErr) {
      console.warn('[purgeExcelRelatedData: catDocs query notice]:', catQueryErr.message);
    }
  }

  // 2. Delete from styles table (and remove associated physical image files)
  for (const style of stylesToDelete) {
    if (style.images) {
      for (const kt of Object.keys(style.images)) {
        for (const img of style.images[kt] || []) {
          if (img.url && img.url.startsWith('/uploads/style-images/')) {
            const fileName = path.basename(img.url);
            const diskPath = path.resolve('uploads/style-images', fileName);
            if (fs.existsSync(diskPath)) {
              try {
                fs.unlinkSync(diskPath);
              } catch (e) {}
            }
          }
        }
      }
    }
  }

  if (styleIds.length > 0) {
    await Style.deleteMany({ _id: { $in: styleIds } });
  }
  if (allTargetCodes.length > 0) {
    await Style.deleteMany({ styleCode: { $in: allTargetCodes } });
  }

  // 3. Delete from styleimages table and filesystem
  if (allTargetCodes.length > 0) {
    const imagesToDelete = await StyleImage.find({ styleCode: { $in: allTargetCodes } });
    for (const img of imagesToDelete) {
      if (img?.imageUrl && img.imageUrl.startsWith('/uploads/style-images/')) {
        const fileName = path.basename(img.imageUrl);
        const diskPath = path.resolve('uploads/style-images', fileName);
        if (fs.existsSync(diskPath)) {
          try {
            fs.unlinkSync(diskPath);
          } catch (e) {}
        }
      }
    }
    await StyleImage.deleteMany({ styleCode: { $in: allTargetCodes } });
  }

  // 4. Clean up dangling style references in orders table
  if (styleIds.length > 0 || allTargetCodes.length > 0) {
    try {
      const orderQuery = [];
      if (styleIds.length > 0) orderQuery.push({ 'items.style': { $in: styleIds } });
      if (allTargetCodes.length > 0) orderQuery.push({ 'items.styleCode': { $in: allTargetCodes } });

      if (orderQuery.length > 0) {
        const ordersToUpdate = await Order.find({ $or: orderQuery });

        for (const order of ordersToUpdate) {
          order.items = order.items.filter(item => {
            const hasStyleId = styleIds.some(id => id.toString() === item.style?.toString());
            const hasStyleCode = allTargetCodes.includes(item.styleCode);
            return !(hasStyleId || hasStyleCode);
          });

          if (order.items.length === 0) {
            await Order.findByIdAndDelete(order._id);
          } else {
            // Recalculate totals
            order.totalItems = order.items.length;
            order.totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            order.totalGrossWeight = order.items.reduce((sum, item) => sum + ((item.grossWeight || 0) * (item.quantity || 1)), 0);
            order.totalNetWeight = order.items.reduce((sum, item) => sum + ((item.netWeight || 0) * (item.quantity || 1)), 0);
            await order.save();
          }
        }
      }
    } catch (orderErr) {
      console.warn('[purgeExcelRelatedData: order reference notice]:', orderErr.message);
    }
  }

  // 5. Clean up affected categories
  const deletedCatIds = [];
  const deletedCatNames = [];

  for (const catId of affectedCatIds) {
    const remainingCount = await Style.countDocuments({ category: catId });
    if (remainingCount === 0) {
      const catDoc = await Category.findById(catId);
      if (catDoc) {
        deletedCatIds.push(catDoc._id);
        deletedCatNames.push(catDoc.name);

        await Customer.updateMany(
          { assignedCategories: catDoc._id },
          { $pull: { assignedCategories: catDoc._id } }
        );
        await Customer.updateMany(
          { 'categoryAccess.category': catDoc._id },
          { $pull: { categoryAccess: { category: catDoc._id } } }
        );
        await Customer.updateMany(
          { 'categoryAccess.categoryName': catDoc.name },
          { $pull: { categoryAccess: { categoryName: catDoc.name } } }
        );
        await Category.findByIdAndDelete(catDoc._id);
      }
    } else {
      await Category.findByIdAndUpdate(catId, { itemCount: remainingCount });
    }
  }

  // If entire import was purged, check all remaining categories in DB for any with 0 styles
  if (importId) {
    const allRemainingCats = await Category.find();
    for (const cat of allRemainingCats) {
      const remainingStyles = await Style.countDocuments({ category: cat._id });
      if (remainingStyles === 0) {
        deletedCatIds.push(cat._id);
        deletedCatNames.push(cat.name);

        await Customer.updateMany(
          { assignedCategories: cat._id },
          { $pull: { assignedCategories: cat._id } }
        );
        await Customer.updateMany(
          { 'categoryAccess.category': cat._id },
          { $pull: { categoryAccess: { category: cat._id } } }
        );
        await Customer.updateMany(
          { 'categoryAccess.categoryName': cat.name },
          { $pull: { categoryAccess: { categoryName: cat.name } } }
        );
        await Category.findByIdAndDelete(cat._id);
      } else {
        await Category.findByIdAndUpdate(cat._id, { itemCount: remainingStyles });
      }
    }
  }

  // 6. Delete CategoryGroups from categorygroups table:
  // (A) Delete ANY CategoryGroup document that contained or referenced any of the deleted categories or deleted category names
  if (deletedCatIds.length > 0 || deletedCatNames.length > 0) {
    const queryConditions = [];
    if (deletedCatIds.length > 0) {
      queryConditions.push({ categories: { $in: deletedCatIds } });
    }
    if (deletedCatNames.length > 0) {
      queryConditions.push({ categoryNames: { $in: deletedCatNames } });
    }
    if (queryConditions.length > 0) {
      const groupsToDelete = await CategoryGroup.find({ $or: queryConditions });
      
      await CategoryGroup.deleteMany({ $or: queryConditions });

      const groupIds = groupsToDelete.map((g) => g._id);
      const groupNames = groupsToDelete.map((g) => g.name);

      if (groupIds.length > 0) {
        await Customer.updateMany(
          { 'categoryAccess.group': { $in: groupIds } },
          { $pull: { categoryAccess: { group: { $in: groupIds } } } }
        );
      }
      if (groupNames.length > 0) {
        await Customer.updateMany(
          { 'categoryAccess.groupName': { $in: groupNames } },
          { $pull: { categoryAccess: { groupName: { $in: groupNames } } } }
        );
      }
    }
  }

  // (B) Delete any CategoryGroup that has no remaining valid categories in the categories table
  const validCategories = await Category.find().select('_id name');
  const validCatIdSet = new Set(validCategories.map((c) => c._id.toString()));

  const allRemainingGroups = await CategoryGroup.find();
  for (const group of allRemainingGroups) {
    const remainingValid = (group.categories || []).filter((cid) => validCatIdSet.has(cid?.toString()));
    if (remainingValid.length === 0) {
      // Group has no valid categories left -> delete the group document permanently from categorygroups table
      await CategoryGroup.findByIdAndDelete(group._id);
      await Customer.updateMany(
        { 'categoryAccess.group': group._id },
        { $pull: { categoryAccess: { group: group._id } } }
      );
      await Customer.updateMany(
        { 'categoryAccess.groupName': group.name },
        { $pull: { categoryAccess: { groupName: group.name } } }
      );
    } else if (remainingValid.length !== group.categories.length) {
      // Some categories were removed, update snapshot
      const validNames = validCategories
        .filter((c) => remainingValid.some((vid) => vid.toString() === c._id.toString()))
        .map((c) => c.name);
      await CategoryGroup.findByIdAndUpdate(group._id, {
        categories: remainingValid,
        categoryNames: validNames
      });
    }
  }

  // (C) Also clean up any lingering groups with empty categories array or missing categories
  const lingeringGroups = await CategoryGroup.find({
    $or: [
      { categories: { $size: 0 } },
      { categories: { $exists: false } },
      { categories: null }
    ]
  });

  if (lingeringGroups.length > 0) {
    const lingeringIds = lingeringGroups.map((g) => g._id);
    const lingeringNames = lingeringGroups.map((g) => g.name);
    
    await CategoryGroup.deleteMany({ _id: { $in: lingeringIds } });
    
    await Customer.updateMany(
      { 'categoryAccess.group': { $in: lingeringIds } },
      { $pull: { categoryAccess: { group: { $in: lingeringIds } } } }
    );
    await Customer.updateMany(
      { 'categoryAccess.groupName': { $in: lingeringNames } },
      { $pull: { categoryAccess: { groupName: { $in: lingeringNames } } } }
    );
  }

  // (D) If no categories remain in the entire database, wipe all category groups
  const totalCategoriesCount = await Category.countDocuments();
  if (totalCategoriesCount === 0) {
    await CategoryGroup.deleteMany({});
    // And strip ALL categoryAccess records from all customers since no categories/groups exist
    await Customer.updateMany({}, { $set: { categoryAccess: [], assignedCategories: [] } });
  }
};

/**
 * @desc    Upload & Sync Excel stock spreadsheet
 * @route   POST /api/admin/excel/upload
 * @access  Private (Admin)
 */
export const uploadExcelStock = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an Excel file (.xlsx, .xls, .csv)' });
    }

    const result = await processExcelFile({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      userId: req.user?._id
    });

    res.status(200).json({
      success: true,
      message: 'Excel stock spreadsheet synced successfully',
      ...result
    });
  } catch (error) {
    console.error('[uploadExcelStock Error]:', error);
    res.status(500).json({
      success: false,
      message: `Excel sync failed: ${error.message}`
    });
  }
};

/**
 * @desc    Get Excel upload history logs (excludes data array for performance)
 * @route   GET /api/admin/excel/history
 * @access  Private (Admin)
 */
export const getExcelHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const total = await ExcelImport.countDocuments();
    const history = await ExcelImport.find()
      .select('-data')
      .populate('uploadedBy', 'name email')
      .sort({ uploadDateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      history,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[getExcelHistory Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upload history', error: error.message });
  }
};

/**
 * @desc    Get current live stock records directly from excelimports table
 * @route   GET /api/admin/excel/stock
 * @access  Private (Admin)
 */
export const getLiveStock = async (req, res) => {
  try {
    const { search, page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const skip = (pageNum - 1) * limitNum;

    // Fetch all completed Excel import records
    const allImports = await ExcelImport.find({ status: 'Completed' }).sort({ uploadDateTime: 1 });
    const latestImport = allImports.length > 0 ? allImports[allImports.length - 1] : null;

    if (!latestImport) {
      return res.status(200).json({
        success: true,
        columns: [],
        rows: [],
        styles: [],
        latestImport: null,
        pagination: {
          total: 0,
          page: 1,
          pages: 0
        }
      });
    }

    const columns = [];
    allImports.forEach(imp => {
      if (imp.detectedColumns) {
        imp.detectedColumns.forEach(col => {
          if (!columns.includes(col)) {
            columns.push(col);
          }
        });
      }
    });

    const activeStyles = await Style.find({ status: 'Active' });
    let allData = activeStyles.map((s, idx) => {
      const row = { ...(s.rawData || {}), _id: s._id, rowIndex: idx + 1 };
      
      const qtyCol = columns.find(c => /^(qty|quantity|stock|available|pcs|nos|pieces|units|availableqty|stockqty|availablestock)$/i.test(c.replace(/[^a-z0-9]/gi, '')));
      if (qtyCol) {
        row[qtyCol] = s.qty;
      }
      return row;
    });

    // Filter by search query if provided
    let filteredData = allData;
    if (search && search.trim()) {
      const searchTerms = search.trim().toLowerCase().split(/\s+/);
      filteredData = allData.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        const rowText = Object.values(row)
          .map((v) => (v !== null && v !== undefined ? String(v).toLowerCase() : ''))
          .join(' ');
        return searchTerms.every((term) => rowText.includes(term));
      });
    }

    const total = filteredData.length;
    const pageSlice = filteredData.slice(skip, skip + limitNum);

    // Map rows with persistent _id and cell data
    const rows = pageSlice.map((item, idx) => ({
      ...item,
      _id: String(item._id),
      rowIndex: item.rowIndex !== undefined ? item.rowIndex : skip + idx + 1
    }));

    const importMeta = {
      _id: latestImport._id,
      fileName: latestImport.fileName,
      uploadDateTime: latestImport.uploadDateTime,
      totalRows: allData.length,
      detectedColumns: columns,
      status: latestImport.status
    };

    res.status(200).json({
      success: true,
      columns,
      rows,
      styles: rows, // alias for backwards compatibility
      latestImport: importMeta,
      availableKts: await getActiveKtList(),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('[getLiveStock Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live stock', error: error.message });
  }
};

/**
 * @desc    Delete a single stock row from active Excel import
 * @route   DELETE /api/admin/excel/stock/row/:rowId
 * @access  Private (Admin)
 */
export const deleteStockRow = async (req, res) => {
  try {
    const { rowId } = req.params;

    const style = await Style.findById(rowId);
    if (!style) {
      return res.status(404).json({ success: false, message: 'Stock row not found' });
    }

    const removedCode = style.styleCode;
    await purgeExcelRelatedData({ styleCodes: [removedCode] });

    const totalRows = await Style.countDocuments({ status: 'Active' });

    res.status(200).json({
      success: true,
      message: 'Stock row deleted successfully',
      totalRows
    });
  } catch (error) {
    console.error('[deleteStockRow Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete stock row', error: error.message });
  }
};

/**
 * @desc    Delete multiple selected stock rows from active Excel import
 * @route   POST /api/admin/excel/stock/delete-rows
 * @access  Private (Admin)
 */
export const deleteStockRows = async (req, res) => {
  try {
    const { rowIds } = req.body;
    if (!Array.isArray(rowIds) || rowIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of row IDs to delete' });
    }

    const styles = await Style.find({ _id: { $in: rowIds } });
    if (styles.length === 0) {
      return res.status(404).json({ success: false, message: 'No active styles found for provided IDs' });
    }

    const removedCodes = styles.map(s => s.styleCode);
    await purgeExcelRelatedData({ styleCodes: removedCodes });

    const totalRows = await Style.countDocuments({ status: 'Active' });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${removedCodes.length} stock rows`,
      deletedCount: removedCodes.length,
      totalRows
    });
  } catch (error) {
    console.error('[deleteStockRows Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete stock rows', error: error.message });
  }
};

/**
 * @desc    Clear all stock data from active Excel import
 * @route   DELETE /api/admin/excel/stock/clear
 * @access  Private (Admin)
 */
export const clearAllStock = async (req, res) => {
  try {
    const allStyles = await Style.find().select('styleCode');
    const allCodes = allStyles.map(s => s.styleCode);

    await purgeExcelRelatedData({ styleCodes: allCodes });
    await ExcelImport.deleteMany({});
    
    // Purge Excel related data should delete styles, categories, categoryGroups
    // but we can also just wipe them as a fallback.
    await Style.deleteMany({});
    await StyleImage.deleteMany({});
    await Category.deleteMany({});
    await CategoryGroup.deleteMany({});

    res.status(200).json({
      success: true,
      message: 'Excel files and all related data across every table deleted successfully',
      totalRows: 0
    });
  } catch (error) {
    console.error('[clearAllStock Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to clear stock data', error: error.message });
  }
};

/**
 * @desc    Delete an Excel upload history log by ID
 * @route   DELETE /api/admin/excel/history/:id
 * @access  Private (Admin)
 */
export const deleteExcelHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const imp = await ExcelImport.findById(id);

    if (!imp) {
      return res.status(404).json({ success: false, message: 'Excel import log not found' });
    }

    const wasLatest = imp.isLatest;

    const detectedColumns = imp.detectedColumns || [];
    const mappings = findColumnMappings(detectedColumns);
    const deductions = {}; // { styleCode: { variants: { variantKey: qty }, totalQty: qty } }

    if (Array.isArray(imp.data)) {
      for (const row of imp.data) {
        // Extract style code
        const rawStyleCode = mappings.styleCodeColIdx >= 0 ? row[detectedColumns[mappings.styleCodeColIdx]] : null;
        const styleCode = rawStyleCode ? String(rawStyleCode).trim().toUpperCase() : getRowStyleCode(row);
        if (!styleCode) continue;

        // Extract qty
        let qty = 0;
        if (mappings.qtyColIdx >= 0 && row[detectedColumns[mappings.qtyColIdx]]) {
          const valStr = String(row[detectedColumns[mappings.qtyColIdx]]).replace(/[^0-9.-]/g, '');
          qty = parseInt(valStr, 10) || 0;
        } else {
          // Fallback
          const qtyKey = Object.keys(row).find(k => /^(qty|quantity|stock)$/i.test(k.replace(/[^a-z0-9]/gi, '')));
          if (qtyKey) {
            qty = parseInt(String(row[qtyKey]).replace(/[^0-9.-]/g, ''), 10) || 0;
          }
        }
        if (qty <= 0) continue;

        // Extract variant key
        let purity = '';
        const explicitPurity = mappings.purityColIdx >= 0 ? String(row[detectedColumns[mappings.purityColIdx]] || '').trim() : '';
        let itemVal = '';
        if (mappings.itemColIdx >= 0 && row[detectedColumns[mappings.itemColIdx]]) {
          itemVal = String(row[detectedColumns[mappings.itemColIdx]]).trim();
        }
        if (!itemVal && row['Item']) itemVal = String(row['Item']).trim();
        if (!itemVal && row['ITEM']) itemVal = String(row['ITEM']).trim();

        const candidateStrings = [
          String(row['Item'] || ''),
          String(row['ITEM'] || ''),
          itemVal,
          explicitPurity,
          String(row['InwardSKUNo'] || ''),
          String(row['Purity'] || '')
        ].filter(Boolean);

        let detectedPurity = null;
        for (const cand of candidateStrings) {
          const ext = extractKtFromItem(cand);
          if (ext) {
            detectedPurity = `${ext.replace(/KT$/i, '')} KT`;
            break;
          }
        }
        if (detectedPurity) purity = detectedPurity;
        else if (explicitPurity) purity = explicitPurity;

        const variantKey = (itemVal || purity || '').toUpperCase();

        if (!deductions[styleCode]) {
          deductions[styleCode] = { variants: {}, totalQty: 0 };
        }
        deductions[styleCode].totalQty += qty;
        deductions[styleCode].variants[variantKey] = (deductions[styleCode].variants[variantKey] || 0) + qty;
      }
    }

    const styleCodesToProcess = Object.keys(deductions);
    const styles = await Style.find({ styleCode: { $in: styleCodesToProcess } });
    const stylesToPurge = [];
    const stylesToUpdate = [];

    for (const style of styles) {
      const deductInfo = deductions[style.styleCode];
      if (!deductInfo) continue;

      let remainingTotal = 0;
      if (style.itemVariants && style.itemVariants.length > 0) {
        style.itemVariants.forEach(variant => {
          const vKey = (variant.item || variant.purity || '').toUpperCase();
          const deductVariantQty = deductInfo.variants[vKey] || 0;
          variant.qty = Math.max(0, (variant.qty || 0) - deductVariantQty);
          remainingTotal += variant.qty;
        });
      } else {
        remainingTotal = Math.max(0, (style.qty || 0) - deductInfo.totalQty);
      }
      
      style.qty = remainingTotal;

      if (style.qty <= 0) {
        stylesToPurge.push(style.styleCode);
      } else {
        if (style.rawData) {
          let updatedRawData = false;
          if (mappings.qtyColIdx >= 0 && detectedColumns[mappings.qtyColIdx]) {
             style.rawData[detectedColumns[mappings.qtyColIdx]] = style.qty;
             updatedRawData = true;
          } else {
             const qtyKey = Object.keys(style.rawData).find(k => /^(qty|quantity|stock)$/i.test(k.replace(/[^a-z0-9]/gi, '')));
             if (qtyKey) {
                style.rawData[qtyKey] = style.qty;
                updatedRawData = true;
             }
          }
          if (updatedRawData) {
             style.markModified('rawData');
          }
        }
        stylesToUpdate.push(style);
      }
    }

    for (const style of stylesToUpdate) {
      await style.save();
    }

    if (stylesToPurge.length > 0) {
      await purgeExcelRelatedData({ styleCodes: stylesToPurge });
    }

    // Delete the import log from excelimports table
    await ExcelImport.findByIdAndDelete(id);

    // If no more Excel imports remain in the database, completely wipe all styles, categories, and category groups
    const remainingImportsCount = await ExcelImport.countDocuments();
    if (remainingImportsCount === 0) {
      await Style.deleteMany({});
      await StyleImage.deleteMany({});
      await Category.deleteMany({});
      await CategoryGroup.deleteMany({});
    }

    // If deleted import was latest, promote the next latest completed import
    if (wasLatest) {
      const nextLatest = await ExcelImport.findOne({ status: 'Completed' })
        .sort({ uploadDateTime: -1 });
      if (nextLatest) {
        nextLatest.isLatest = true;
        await nextLatest.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Excel file and all related data across every table deleted successfully'
    });
  } catch (error) {
    console.error('[deleteExcelHistory Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete upload log', error: error.message });
  }
};

/**
 * @desc    Get stock availability (qty) for given style codes
 * @route   GET /api/admin/excel/stock/availability?styleCodes=ABC,DEF
 * @access  Private (Admin)
 */
export const getStockAvailability = async (req, res) => {
  try {
    const { styleCodes } = req.query;
    if (!styleCodes) {
      return res.status(400).json({ success: false, message: 'Please provide styleCodes query parameter' });
    }

    const codes = styleCodes.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (codes.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid style codes provided' });
    }

    const styles = await Style.find({ styleCode: { $in: codes } }).select('styleCode qty');
    const availability = styles.map((s) => ({
      styleCode: s.styleCode,
      qty: s.qty || 0
    }));

    res.status(200).json({
      success: true,
      availability
    });
  } catch (error) {
    console.error('[getStockAvailability Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stock availability', error: error.message });
  }
};

/**
 * @desc    Get dynamic unique KT values extracted from the active Excel sheet's ITEM column
 * @route   GET /api/admin/excel/kts
 * @access  Public / Private
 */
export const getDetectedKts = async (req, res) => {
  try {
    const kts = await getActiveKtList();
    res.status(200).json({
      success: true,
      kts,
      items: kts
    });
  } catch (error) {
    console.error('[getDetectedKts Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dynamic KT values', error: error.message });
  }
};
