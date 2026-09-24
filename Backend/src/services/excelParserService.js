import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import Category from '../models/Category.js';
import Style from '../models/Style.js';
import ExcelImport from '../models/ExcelImport.js';
import { extractKtFromItem, extractUniqueItemsFromExcelRows, extractUniqueKtsFromExcelRows, calculateStylePendingKts } from '../utils/ktHelper.js';

/**
 * Clean a key name to be safely stored as a property in MongoDB
 */
const cleanKeyForMongo = (key) => {
  if (!key) return 'Column';
  return String(key)
    .trim()
    .replace(/^\$/, '_')
    .replace(/\./g, ' ');
};

/**
 * Intelligent header row detector
 * Works for any spreadsheet: scans the first 15 rows to find the true table header row
 * based on non-empty cells and text formatting.
 */
const detectHeaderRowIndex = (sheetData) => {
  if (!sheetData || sheetData.length === 0) return 0;

  const maxScanRows = Math.min(15, sheetData.length);
  let bestRowIndex = 0;
  let highestScore = -1;

  for (let r = 0; r < maxScanRows; r++) {
    const row = sheetData[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nonEmptyCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmptyCells.length === 0) continue;

    // Header rows typically have multiple distinct string labels
    let stringCellsCount = 0;
    for (const cell of nonEmptyCells) {
      if (typeof cell === 'string' && isNaN(cell)) {
        stringCellsCount++;
      }
    }

    const score = nonEmptyCells.length * 2 + stringCellsCount * 3;

    if (score > highestScore) {
      highestScore = score;
      bestRowIndex = r;
    }
  }

  return bestRowIndex;
};

/**
 * Opportunistic locator for StyleCode, Category, and Weight columns
 * (Used only if the spreadsheet is a jewellery style master)
 */
export const findColumnMappings = (headers) => {
  let styleCodeColIdx = -1;
  let categoryColIdx = -1;
  let grossWtColIdx = -1;
  let netWtColIdx = -1;
  let purityColIdx = -1;
  let descriptionColIdx = -1;
  let skuColIdx = -1;
  let jewelCodeColIdx = -1;
  let qtyColIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(stylecode|styleno|style|itemcode|itemno|designno|designcode|modelno|modelcode|barcode|tagno)$/.test(h)) {
      styleCodeColIdx = i;
      break;
    }
  }

  if (styleCodeColIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase();
      if (
        h.includes('style') ||
        h.includes('design') ||
        h.includes('item code') ||
        h.includes('item no') ||
        h.includes('tag no') ||
        h.includes('barcode')
      ) {
        styleCodeColIdx = i;
        break;
      }
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(inwardskuno|skuno|sku|inwardsku)$/.test(h)) skuColIdx = i;
    if (/^(jewelcode|jewelno|jewel)$/.test(h)) jewelCodeColIdx = i;
  }

  if (styleCodeColIdx === -1) {
    if (skuColIdx !== -1) styleCodeColIdx = skuColIdx;
    else if (jewelCodeColIdx !== -1) styleCodeColIdx = jewelCodeColIdx;
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(category|categoryname|cat|catname|itemcategory|itemgroup|group|collection|department|type|family)$/.test(h)) {
      categoryColIdx = i;
      break;
    }
  }

  if (categoryColIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase();
      if (h.includes('category') || h.includes('group') || h.includes('collection')) {
        categoryColIdx = i;
        break;
      }
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(grosswt|grossweight|gwt|grwt|gross)$/.test(h)) {
      grossWtColIdx = i;
      break;
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(netwt|netweight|nwt|ntwt|net)$/.test(h)) {
      netWtColIdx = i;
      break;
    }
  }

  // Fallback: If net weight wasn't matched explicitly, check for 'wt' or 'goldwt' distinct from gross weight
  if (netWtColIdx === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (i === grossWtColIdx) continue;
      const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (/^(wt|weight|goldwt|fine)$/.test(h)) {
        netWtColIdx = i;
        break;
      }
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(purity|kt|karat|touch|puritystandard)$/.test(h)) {
      purityColIdx = i;
      break;
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(description|desc|itemname|productname|remarks|notes)$/.test(h)) {
      descriptionColIdx = i;
      break;
    }
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(qty|quantity|stock|available|pcs|nos|pieces|units|availableqty|stockqty|availablestock)$/.test(h)) {
      qtyColIdx = i;
      break;
    }
  }

  let itemColIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(item|itemname|metal|goldtype|itemtype|karattype)$/.test(h)) {
      itemColIdx = i;
      break;
    }
  }

  return {
    styleCodeColIdx,
    itemColIdx,
    categoryColIdx,
    grossWtColIdx,
    netWtColIdx,
    purityColIdx,
    descriptionColIdx,
    qtyColIdx
  };
};

/**
 * Main Dynamic Excel Parsing & Sync Engine
 * Handles any Excel sheet dynamically without assuming fixed column names, column counts, or row counts.
 */
export const processExcelFile = async ({ fileBuffer, fileName, userId }) => {
  // 1. Create Import Log Record
  const importLog = await ExcelImport.create({
    fileName,
    uploadedBy: userId,
    status: 'Processing',
    isLatest: false
  });

  try {
    // 2. Read Workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      throw new Error('Excel workbook contains no readable sheets');
    }

    // Find the first sheet with data
    let sheetData = [];

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (data && data.length > 0) {
        sheetData = data;
        break;
      }
    }

    if (!sheetData || sheetData.length === 0) {
      throw new Error('Excel sheet contains no data rows');
    }

    // 3. Detect true header row
    const headerRowIdx = detectHeaderRowIndex(sheetData);
    const rawHeaders = sheetData[headerRowIdx] || [];

    // Clean and preserve detected column names in exact order
    const detectedColumns = [];
    const usedNames = new Set();

    // Determine the effective column count (exclude trailing all-empty columns)
    let maxCols = rawHeaders.length;
    for (let c = maxCols - 1; c >= 0; c--) {
      const h = rawHeaders[c];
      if (h !== null && h !== undefined && String(h).trim() !== '') {
        maxCols = c + 1;
        break;
      }
    }

    for (let c = 0; c < maxCols; c++) {
      let h = String(rawHeaders[c] || '').trim();
      if (!h) {
        h = `Column ${c + 1}`;
      }
      h = cleanKeyForMongo(h);

      let uniqueName = h;
      let counter = 2;
      while (usedNames.has(uniqueName.toLowerCase())) {
        uniqueName = `${h} (${counter++})`;
      }
      usedNames.add(uniqueName.toLowerCase());
      detectedColumns.push(uniqueName);
    }

    if (detectedColumns.length === 0) {
      throw new Error('Could not identify any valid column headers in the spreadsheet');
    }

    // 4. Parse all data rows below the header row dynamically
    const parsedData = [];

    for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
      const row = sheetData[r];
      if (!Array.isArray(row)) continue;

      // Skip row if completely empty
      const hasContent = row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (!hasContent) continue;

      const rowData = {
        _id: new mongoose.Types.ObjectId().toString()
      };
      for (let c = 0; c < detectedColumns.length; c++) {
        const colName = detectedColumns[c];
        const cellVal = row[c];
        if (cellVal !== undefined && cellVal !== null) {
          rowData[colName] = typeof cellVal === 'string' ? cellVal.trim() : cellVal;
        } else {
          rowData[colName] = '';
        }
      }

      parsedData.push(rowData);
    }

    if (parsedData.length === 0) {
      throw new Error('No data rows found below the header row in the uploaded Excel sheet');
    }

    // 5. Deactivate previous latest import records
    await ExcelImport.updateMany({ _id: { $ne: importLog._id }, isLatest: true }, { $set: { isLatest: false } });

    // 6. Opportunistic Style & Category synchronization (non-blocking for jewellery master)
    let newStylesCount = 0;
    let updatedStylesCount = 0;
    let detectedItems = [];
    try {
      const mappings = findColumnMappings(detectedColumns);
      if (mappings.styleCodeColIdx >= 0) {
        const validStyleRows = [];
        const uploadedStyleCodes = new Set();
        const categoriesSet = new Set();
        detectedItems = extractUniqueItemsFromExcelRows(parsedData, detectedColumns);
        const detectedKts = detectedItems;

        for (const rowData of parsedData) {
          const rawStyleCode = rowData[detectedColumns[mappings.styleCodeColIdx]];
          const styleCode = rawStyleCode ? String(rawStyleCode).trim().toUpperCase() : '';
          if (!styleCode) continue;

          let categoryName = 'General Jewellery';
          if (mappings.categoryColIdx >= 0 && rowData[detectedColumns[mappings.categoryColIdx]]) {
            const catVal = String(rowData[detectedColumns[mappings.categoryColIdx]]).trim();
            if (catVal) categoryName = catVal;
          }

          let grossWeight = 0;
          if (mappings.grossWtColIdx >= 0 && rowData[detectedColumns[mappings.grossWtColIdx]]) {
            const valStr = String(rowData[detectedColumns[mappings.grossWtColIdx]]).replace(/[^0-9.]/g, '');
            grossWeight = parseFloat(valStr) || 0;
          }

          let netWeight = grossWeight;
          if (mappings.netWtColIdx >= 0 && rowData[detectedColumns[mappings.netWtColIdx]]) {
            const valStr = String(rowData[detectedColumns[mappings.netWtColIdx]]).replace(/[^0-9.]/g, '');
            netWeight = parseFloat(valStr) || grossWeight;
          }

          let purity = '22 KT';
          const explicitPurity = mappings.purityColIdx >= 0 ? String(rowData[detectedColumns[mappings.purityColIdx]] || '').trim() : '';
          const candidateStrings = [
            String(rowData['Item'] || ''),
            String(rowData['ITEM'] || ''),
            mappings.itemColIdx >= 0 ? String(rowData[detectedColumns[mappings.itemColIdx]] || '') : '',
            explicitPurity,
            String(rowData['InwardSKUNo'] || ''),
            String(rowData['Purity'] || '')
          ].filter(Boolean);

          let detectedPurity = null;
          for (const cand of candidateStrings) {
            const ext = extractKtFromItem(cand);
            if (ext) {
              detectedPurity = `${ext.replace(/KT$/i, '')} KT`;
              break;
            }
          }
          if (detectedPurity) {
            purity = detectedPurity;
          } else if (explicitPurity) {
            purity = explicitPurity;
          }

          let itemVal = '';
          if (mappings.itemColIdx >= 0 && rowData[detectedColumns[mappings.itemColIdx]]) {
            itemVal = String(rowData[detectedColumns[mappings.itemColIdx]]).trim();
          }
          if (!itemVal && rowData['Item']) itemVal = String(rowData['Item']).trim();
          if (!itemVal && rowData['ITEM']) itemVal = String(rowData['ITEM']).trim();

          let itemCode = '';
          const candItem = `${itemVal} ${purity} ${rowData['InwardSKUNo'] || ''}`.toUpperCase();
          const ktCode = extractKtFromItem(candItem);
          if (ktCode) {
            itemCode = `G${ktCode.replace(/KT$/i, '')}`;
          } else if (itemVal) {
            itemCode = itemVal;
          }

          if (!itemVal && itemCode) itemVal = itemCode;

          let description = '';
          if (mappings.descriptionColIdx >= 0 && rowData[detectedColumns[mappings.descriptionColIdx]]) {
            description = String(rowData[detectedColumns[mappings.descriptionColIdx]]).trim();
          }

          let qty = 0;
          if (mappings.qtyColIdx >= 0 && rowData[detectedColumns[mappings.qtyColIdx]]) {
            const valStr = String(rowData[detectedColumns[mappings.qtyColIdx]]).replace(/[^0-9.]/g, '');
            qty = parseInt(valStr, 10) || 0;
          }

          validStyleRows.push({
            styleCode,
            item: itemVal,
            itemCode,
            categoryName,
            grossWeight,
            netWeight,
            purity,
            description,
            qty,
            rawData: rowData
          });

          uploadedStyleCodes.add(styleCode);
          categoriesSet.add(categoryName);
        }

        if (validStyleRows.length > 0) {
          const categoryMap = new Map();
          for (const catName of categoriesSet) {
            const normalizedCat = catName.trim().toLowerCase();
            let category = await Category.findOne({ normalizedName: normalizedCat });
            if (!category) {
              category = await Category.create({
                name: catName.trim(),
                normalizedName: normalizedCat,
                description: `Auto-created from Excel sync: ${fileName}`
              });
            }
            categoryMap.set(normalizedCat, category);
          }

          // Group strictly by styleCode for the Admin master catalog (1 document per styleCode)
          // Store each item variant in itemVariants array for Customer Panel, Shared Links, and PDFs
          const uniqueStylesMap = new Map();
          for (const row of validStyleRows) {
            const styleCode = row.styleCode;
            const variantKey = (row.item || row.purity || '').toUpperCase();

            if (!uniqueStylesMap.has(styleCode)) {
              const variantsMap = new Map();
              variantsMap.set(variantKey, {
                item: row.item,
                itemCode: row.itemCode,
                purity: row.purity,
                grossWeight: row.grossWeight,
                netWeight: row.netWeight,
                qty: row.qty || 0,
                rawData: row.rawData,
                lastExcelImportId: importLog._id
              });

              uniqueStylesMap.set(styleCode, {
                ...row,
                variantsMap
              });
            } else {
              const existing = uniqueStylesMap.get(styleCode);
              if (existing.variantsMap.has(variantKey)) {
                const v = existing.variantsMap.get(variantKey);
                v.qty = (v.qty || 0) + (row.qty || 0);
              } else {
                existing.variantsMap.set(variantKey, {
                  item: row.item,
                  itemCode: row.itemCode,
                  purity: row.purity,
                  grossWeight: row.grossWeight,
                  netWeight: row.netWeight,
                  qty: row.qty || 0,
                  rawData: row.rawData,
                  lastExcelImportId: importLog._id
                });
              }
            }
          }

          const existingStyles = await Style.find({
            styleCode: { $in: Array.from(uploadedStyleCodes) }
          }).select('styleCode images qty itemVariants rawData item itemCode categoryName grossWeight netWeight purity description');
          const existingMap = new Map(existingStyles.map((s) => [s.styleCode, s]));

          const bulkOps = [];
          for (const item of uniqueStylesMap.values()) {
            const catDoc = categoryMap.get(item.categoryName.toLowerCase());
            const existingStyle = existingMap.get(item.styleCode);
            
            let finalQty = 0;
            let finalItemVariants = [];
            let finalRawData = item.rawData;

            if (existingStyle) {
              updatedStylesCount++;

              // Combine itemVariants
              const existingVariantsMap = new Map();
              if (existingStyle.itemVariants) {
                for (const ev of existingStyle.itemVariants) {
                  const variantKey = (ev.item || ev.purity || '').toUpperCase();
                  existingVariantsMap.set(variantKey, ev);
                }
              }

              for (const [variantKey, newVar] of item.variantsMap.entries()) {
                if (existingVariantsMap.has(variantKey)) {
                  const ev = existingVariantsMap.get(variantKey);
                  ev.qty = newVar.qty || 0;
                  ev.grossWeight = newVar.grossWeight || ev.grossWeight;
                  ev.netWeight = newVar.netWeight || ev.netWeight;
                  ev.rawData = newVar.rawData;
                  ev.lastExcelImportId = importLog._id;
                  existingVariantsMap.set(variantKey, ev);
                } else {
                  existingVariantsMap.set(variantKey, newVar);
                }
              }

              finalItemVariants = Array.from(existingVariantsMap.values());
              finalQty = finalItemVariants.reduce((sum, v) => sum + (v.qty || 0), 0);

              // Merge rawData: Keep existing, overwrite with new
              finalRawData = { ...(existingStyle.rawData || {}), ...item.rawData };
              
              // Ensure qty column in rawData reflects final merged qty
              if (mappings.qtyColIdx >= 0 && detectedColumns[mappings.qtyColIdx]) {
                const qtyColName = detectedColumns[mappings.qtyColIdx];
                finalRawData[qtyColName] = finalQty;
              } else {
                const qtyKey = Object.keys(finalRawData).find(k => /^(qty|quantity|stock)$/i.test(k));
                if (qtyKey) {
                  finalRawData[qtyKey] = finalQty;
                }
              }
            } else {
              newStylesCount++;
              finalItemVariants = Array.from(item.variantsMap.values());
              finalQty = finalItemVariants.reduce((sum, v) => sum + (v.qty || 0), 0);
            }

            const currentImages = existingStyle ? (existingStyle.images || {}) : {};
            const finalPendingKts = calculateStylePendingKts({
              itemVariants: finalItemVariants,
              item: existingStyle ? (existingStyle.item || item.item) : item.item,
              purity: existingStyle ? (existingStyle.purity || item.purity) : item.purity,
              images: currentImages
            });

            bulkOps.push({
              updateOne: {
                filter: { styleCode: item.styleCode },
                update: {
                  $set: {
                    styleCode: item.styleCode,
                    item: existingStyle ? (existingStyle.item || item.item) : item.item,
                    itemCode: existingStyle ? (existingStyle.itemCode || item.itemCode) : item.itemCode,
                    category: catDoc ? catDoc._id : null,
                    categoryName: existingStyle ? (existingStyle.categoryName || item.categoryName) : item.categoryName,
                    grossWeight: existingStyle ? (existingStyle.grossWeight || item.grossWeight) : item.grossWeight,
                    netWeight: existingStyle ? (existingStyle.netWeight || item.netWeight) : item.netWeight,
                    qty: finalQty,
                    purity: existingStyle ? (existingStyle.purity || item.purity) : item.purity,
                    description: existingStyle ? (existingStyle.description || item.description) : item.description,
                    rawData: finalRawData,
                    itemVariants: finalItemVariants,
                    pendingKts: finalPendingKts,
                    status: 'Active',
                    lastExcelImportId: importLog._id
                  },
                  $setOnInsert: {
                    images: {}
                  }
                },
                upsert: true
              }
            });
          }

          const CHUNK_SIZE = 500;
          for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
            const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
            if (chunk.length > 0) {
              await Style.bulkWrite(chunk, { ordered: false });
            }
          }

          // Update active items count for categories
          const allCategories = await Category.find();
          for (const catDoc of allCategories) {
            const count = await Style.countDocuments({
              category: catDoc._id,
              status: 'Active'
            });
            await Category.findByIdAndUpdate(catDoc._id, { itemCount: count });
          }
        }
      }
    } catch (styleSyncErr) {
      console.warn('[processExcelFile: Opportunistic Style sync notice]:', styleSyncErr.message);
    }

    // 7. Complete ExcelImport log with data array
    importLog.totalRows = parsedData.length;
    importLog.newRecords = newStylesCount;
    importLog.updatedRecords = updatedStylesCount;
    importLog.unchangedRecords = Math.max(0, parsedData.length - newStylesCount - updatedStylesCount);
    importLog.failedRows = 0;
    importLog.detectedColumns = detectedColumns;
    importLog.detectedItems = detectedItems;
    importLog.detectedKts = detectedItems;
    importLog.data = parsedData;
    importLog.isLatest = true;
    importLog.status = 'Completed';
    await importLog.save();

    return {
      success: true,
      importId: importLog._id,
      detectedColumns,
      detectedItems,
      detectedKts: detectedItems,
      stats: {
        totalRows: parsedData.length,
        columnsCount: detectedColumns.length,
        newRecords: newStylesCount,
        updatedRecords: updatedStylesCount,
        failedRows: 0
      }
    };
  } catch (error) {
    console.error('[processExcelFile Error]:', error);
    importLog.status = 'Failed';
    importLog.errorLogs.push({ row: 0, styleCode: 'SYSTEM', error: error.message });
    await importLog.save();
    throw error;
  }
};
