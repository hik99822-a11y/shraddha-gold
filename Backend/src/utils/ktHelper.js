import ExcelImport from '../models/ExcelImport.js';
import Style from '../models/Style.js';

/**
 * Extracts a standardized Karat / KT string (e.g. '18KT', '20KT', '22KT', '14KT', '24KT')
 * from an ITEM column value (or item description).
 */
export const extractKtFromItem = (itemStr) => {
  if (!itemStr || typeof itemStr !== 'string') return null;
  const str = itemStr.trim();
  if (!str) return null;

  // 1. Explicit KT or K pattern: e.g. "G18KT", "18KT", "18 KT", "18K", "22KT"
  const ktMatch = str.match(/(?:^|\b|G)(\d{1,2})\s*(?:KT|K\b)/i);
  if (ktMatch && ktMatch[1]) {
    return `${ktMatch[1]}KT`;
  }

  // 2. G followed by 1-2 digits: e.g. "G18 ROSE", "G22", "G20 WHITE", "G14"
  const gMatch = str.match(/\bG(\d{1,2})(?!\d)/i);
  if (gMatch && gMatch[1]) {
    return `${gMatch[1]}KT`;
  }

  // 3. Number followed by carat/karat words: e.g. "18 KARAT", "22 CARAT"
  const wordMatch = str.match(/\b(\d{1,2})\s*(?:karat|carat)\b/i);
  if (wordMatch && wordMatch[1]) {
    return `${wordMatch[1]}KT`;
  }

  // 4. Standalone 1-2 digit number representing karat
  const pureNum = str.match(/^\s*(\d{1,2})\s*$/);
  if (pureNum && pureNum[1]) {
    return `${pureNum[1]}KT`;
  }

  return str;
};

/**
 * Natural sort for item names (e.g. ['G18 ROSE', 'G18KT YELLOW', 'G22KT'])
 */
export const sortItems = (items = []) => {
  return [...new Set(items)]
    .filter((it) => it && typeof it === 'string' && it.trim().length > 0)
    .map((it) => it.trim())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
};

export const sortKts = sortItems;

/**
 * Extracts all unique exact values directly from the ITEM column of Excel rows.
 */
export const extractUniqueItemsFromExcelRows = (rows = [], detectedColumns = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Find the ITEM column header (case-insensitive)
  const itemColName =
    (detectedColumns || []).find((c) => /^item$/i.test(c)) || 'Item';

  const itemSet = new Set();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rawVal =
      row[itemColName] !== undefined
        ? row[itemColName]
        : row['ITEM'] !== undefined
        ? row['ITEM']
        : row['Item'];

    if (rawVal !== undefined && rawVal !== null) {
      const trimmed = String(rawVal).trim();
      if (trimmed.length > 0) {
        itemSet.add(trimmed);
      }
    }
  }

  return sortItems(Array.from(itemSet));
};

export const extractUniqueKtsFromExcelRows = extractUniqueItemsFromExcelRows;

/**
 * Retrieves the currently active unique exact ITEM values in the system.
 * Looks first at the latest completed ExcelImport document (detectedItems / detectedKts),
 * and falls back to querying the Style collection's distinct 'item' values.
 */
export const getActiveItemList = async () => {
  try {
    const allImports = await ExcelImport.find({ status: 'Completed' });
    const combinedItems = new Set();
    const combinedKts = new Set();

    for (const imp of allImports) {
      if (Array.isArray(imp.detectedItems)) {
        imp.detectedItems.forEach(i => combinedItems.add(i));
      }
      if (Array.isArray(imp.detectedKts)) {
        imp.detectedKts.forEach(k => combinedKts.add(k));
      }
      
      if ((!imp.detectedItems || imp.detectedItems.length === 0) && Array.isArray(imp.data) && imp.data.length > 0) {
        const detected = extractUniqueItemsFromExcelRows(imp.data, imp.detectedColumns);
        detected.forEach(i => combinedItems.add(i));
        
        // Asynchronously update the document if we had to extract it
        if (detected.length > 0) {
          ExcelImport.updateOne(
            { _id: imp._id },
            { $set: { detectedItems: detected, detectedKts: detected } }
          ).catch(console.error);
        }
      }
    }

    const itemsArr = Array.from(combinedItems);
    const ktsArr = Array.from(combinedKts);

    if (itemsArr.length > 0) {
      return sortItems(itemsArr);
    }

    if (ktsArr.length > 0) {
      const hasFullItems = ktsArr.some((k) => k.includes(' ') || !/^\d+KT$/i.test(k));
      if (hasFullItems) {
        return sortItems(ktsArr);
      }
    }

    // Fallback: extract distinct ITEM values from the Style collection
    const styleItems = await Style.distinct('item');
    const validItems = sortItems(styleItems);
    if (validItems.length > 0) return validItems;

    // Further fallback: check style purity field
    const purities = await Style.distinct('purity');
    return sortItems(purities);
  } catch (err) {
    console.error('[ktHelper: getActiveItemList Error]:', err);
    return [];
  }
};

/**
 * Alias for backward compatibility across controllers and routes.
 */
export const getActiveKtList = getActiveItemList;

/**
 * Extracts all distinct stock KT / item purities for a given style.
 * Includes active catalog KTs (G18 ROSE, G18KT YELLOW, G22KT) and any style-specific variants.
 */
export const getStyleKts = (style, availableKts = []) => {
  const set = new Set();

  // 1. Include active catalog purities
  const defaultList = Array.isArray(availableKts) && availableKts.length > 0
    ? availableKts
    : ['G18 ROSE', 'G18KT YELLOW', 'G22KT'];
  defaultList.forEach((k) => {
    if (k && typeof k === 'string' && k.trim()) set.add(k.trim());
  });

  // 2. Include any item variants from stock
  if (Array.isArray(style?.itemVariants) && style.itemVariants.length > 0) {
    for (const v of style.itemVariants) {
      const val = v.item || v.itemCode || v.purity;
      if (val && typeof val === 'string' && val.trim()) {
        set.add(val.trim());
      }
    }
  }

  if (set.size === 0) {
    const val = style?.item || style?.purity;
    if (val && typeof val === 'string' && val.trim()) {
      set.add(val.trim());
    }
  }

  if (set.size === 0) {
    set.add('22KT');
  }

  return sortItems(Array.from(set));
};

/**
 * Checks whether style.images contains uploaded photos for a specific KT
 */
export const hasPhotosForKt = (images, kt) => {
  if (!images || typeof images !== 'object') return false;

  // 1. Exact match
  if (Array.isArray(images[kt]) && images[kt].some((img) => img && img.url)) return true;

  // 2. Case-insensitive match
  const upperKt = String(kt).toUpperCase().trim();
  for (const [k, arr] of Object.entries(images)) {
    if (String(k).toUpperCase().trim() === upperKt && Array.isArray(arr) && arr.some((img) => img && img.url)) {
      return true;
    }
  }

  // 3. Normalized KT match (e.g. "G18 ROSE" matches "18KT", but NOT "G18KT YELLOW")
  const normKt = extractKtFromItem(kt);
  if (normKt && normKt !== kt) {
    if (Array.isArray(images[normKt]) && images[normKt].some((img) => img && img.url)) return true;
    const upperNorm = normKt.toUpperCase().trim();
    for (const [k, arr] of Object.entries(images)) {
      if (String(k).toUpperCase().trim() === upperNorm && Array.isArray(arr) && arr.some((img) => img && img.url)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Calculates which KT values for a style currently have NO uploaded photos.
 */
export const calculateStylePendingKts = (style, availableKts = []) => {
  if (!style) return [];
  const stockKts = getStyleKts(style, availableKts);
  const images = style.images || {};
  const pending = [];

  for (const kt of stockKts) {
    if (!hasPhotosForKt(images, kt)) {
      pending.push(kt);
    }
  }

  return sortItems(pending);
};

/**
 * Intelligently resolves all valid images for a style and optional target KT.
 * Handles exact KT, normalized KT (e.g. 'G22KT' -> '22KT'), pure numbers,
 * case-insensitive matching, and falls back to any available valid images.
 */
export const resolveStyleImages = (style, targetKt = null) => {
  if (!style) return [];

  const filterValid = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((img) => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .sort((a, b) => (Number(a.slot) || 1) - (Number(b.slot) || 1));
  };

  if (Array.isArray(style.images)) {
    const valid = filterValid(style.images);
    if (valid.length > 0) return valid;
  }

  if (style.images && typeof style.images === 'object') {
    const imagesObj = style.images;
    const candidates = [];

    if (targetKt && typeof targetKt === 'string' && targetKt.trim()) {
      const t = targetKt.trim();
      candidates.push(t);
      const norm = extractKtFromItem(t);
      if (norm && !candidates.includes(norm)) candidates.push(norm);
      const numOnly = t.replace(/[^\d]/g, '');
      if (numOnly) {
        if (!candidates.includes(`${numOnly}KT`)) candidates.push(`${numOnly}KT`);
        if (!candidates.includes(`G${numOnly}`)) candidates.push(`G${numOnly}`);
        if (!candidates.includes(`${numOnly} KT`)) candidates.push(`${numOnly} KT`);
      }
    }

    const styleItem = style.item || style.rawData?.ITEM || style.rawData?.Item || style.purity;
    if (styleItem && typeof styleItem === 'string' && !candidates.includes(styleItem.trim())) {
      candidates.push(styleItem.trim());
      const normStyle = extractKtFromItem(styleItem.trim());
      if (normStyle && !candidates.includes(normStyle)) candidates.push(normStyle);
    }

    // 1. Exact key match
    for (const cand of candidates) {
      if (imagesObj[cand]) {
        const valid = filterValid(imagesObj[cand]);
        if (valid.length > 0) return valid;
      }
    }

    // 2. Case-insensitive and whitespace-tolerant match
    const entries = Object.entries(imagesObj);
    for (const cand of candidates) {
      const cleanCand = cand.replace(/[\s\-_]+/g, '').toUpperCase();
      for (const [k, arr] of entries) {
        if (k.replace(/[\s\-_]+/g, '').toUpperCase() === cleanCand) {
          const valid = filterValid(arr);
          if (valid.length > 0) return valid;
        }
      }
    }

    // 3. Partial KT match (matching digits, e.g. 18, 20, 22)
    for (const cand of candidates) {
      const num = cand.replace(/[^\d]/g, '');
      if (num && num.length >= 2) {
        for (const [k, arr] of entries) {
          const keyNum = k.replace(/[^\d]/g, '');
          if (keyNum === num) {
            const valid = filterValid(arr);
            if (valid.length > 0) return valid;
          }
        }
      }
    }

    // 4. Fallback: Any non-empty image list across all keys
    for (const [_, arr] of entries) {
      const valid = filterValid(arr);
      if (valid.length > 0) return valid;
    }
  }

  if (style.imageUrl && typeof style.imageUrl === 'string' && style.imageUrl.trim()) {
    return [{ slot: 1, url: style.imageUrl.trim() }];
  }
  if (style.image && typeof style.image === 'string' && style.image.trim()) {
    return [{ slot: 1, url: style.image.trim() }];
  }

  return [];
};

export const getPrimaryImageUrl = (style, targetKt = null) => {
  const images = resolveStyleImages(style, targetKt);
  return images[0]?.url || '';
};

