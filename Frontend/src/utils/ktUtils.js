/**
 * Frontend Item / KT Utilities
 * Provides dynamic extraction, formatting, and sorting of exact values from Excel data table ITEM column.
 */

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
 * Formats an Item code for display: e.g. 'All' -> 'All Items', 'G18 ROSE' -> 'G18 ROSE'
 */
export const formatItemLabel = (item) => {
  if (!item) return '';
  if (item.toLowerCase() === 'all') return 'All Items';
  return item;
};

export const formatKtLabel = formatItemLabel;

/**
 * Extracts unique exact Item values from Excel stock table rows
 */
export const extractUniqueItemsFromRows = (rows = [], itemColName = 'Item') => {
  if (!Array.isArray(rows)) return [];
  const set = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const val =
      row[itemColName] !== undefined
        ? row[itemColName]
        : row['ITEM'] !== undefined
        ? row['ITEM']
        : row['Item'];
    if (val) {
      const trimmed = String(val).trim();
      if (trimmed.length > 0) set.add(trimmed);
    }
  }
  return sortItems(Array.from(set));
};

export const extractUniqueKtsFromRows = extractUniqueItemsFromRows;

/**
 * Extracts unique exact Item values from an array of styles by inspecting item, rawData, and itemVariants
 */
export const extractUniqueItemsFromStyles = (styles = []) => {
  if (!Array.isArray(styles)) return [];
  const set = new Set();
  for (const s of styles) {
    if (!s) continue;
    const row = s.rawData || {};
    const candList = [
      s.item,
      row.ITEM,
      row.Item,
      row.InwardSKUNo,
      s.purity,
      row.Purity
    ];
    for (const cand of candList) {
      if (cand && typeof cand === 'string') {
        const trimmed = cand.trim();
        if (trimmed.length > 0 && !set.has(trimmed)) {
          set.add(trimmed);
          break; // Use primary item for this style
        }
      }
    }
    if (Array.isArray(s.itemVariants)) {
      for (const v of s.itemVariants) {
        const vItem = v.item || v.itemCode;
        if (vItem && typeof vItem === 'string') {
          const trimmed = vItem.trim();
          if (trimmed.length > 0) set.add(trimmed);
        }
      }
    }
  }
  return sortItems(Array.from(set));
};

export const extractUniqueKtsFromStyles = extractUniqueItemsFromStyles;

/**
 * Dynamically resolves the exact Item value of a style object
 */
export const getStyleItem = (style) => {
  if (!style) return '';
  if (style.item && typeof style.item === 'string' && style.item.trim().length > 0) {
    return style.item.trim();
  }
  const row = style.rawData || {};
  if (row.ITEM && typeof row.ITEM === 'string' && row.ITEM.trim().length > 0) {
    return row.ITEM.trim();
  }
  if (row.Item && typeof row.Item === 'string' && row.Item.trim().length > 0) {
    return row.Item.trim();
  }
  if (style.purity && typeof style.purity === 'string' && style.purity.trim().length > 0) {
    return style.purity.trim();
  }
  return '';
};

export const getStylePurity = getStyleItem;

/**
 * Extracts standardized KT string (e.g. '18KT', '20KT', '22KT')
 * from an ITEM value or description.
 */
export const extractKtFromItem = (itemStr) => {
  if (!itemStr || typeof itemStr !== 'string') return null;
  const str = itemStr.trim();
  if (!str) return null;

  const ktMatch = str.match(/(?:^|\b|G)(\d{1,2})\s*(?:KT|K\b)/i);
  if (ktMatch && ktMatch[1]) return `${ktMatch[1]}KT`;

  const gMatch = str.match(/\bG(\d{1,2})(?!\d)/i);
  if (gMatch && gMatch[1]) return `${gMatch[1]}KT`;

  const wordMatch = str.match(/\b(\d{1,2})\s*(?:karat|carat)\b/i);
  if (wordMatch && wordMatch[1]) return `${wordMatch[1]}KT`;

  const pureNum = str.match(/^\s*(\d{1,2})\s*$/);
  if (pureNum && pureNum[1]) return `${pureNum[1]}KT`;

  return str;
};

/**
 * Dynamically resolves item code (e.g. G18, G22) for a style object
 */
export const getStyleItemCode = (style) => {
  if (!style) return '';
  if (style.itemCode) return style.itemCode;
  const itemVal = getStyleItem(style);
  if (itemVal) {
    const gMatch = itemVal.match(/^G(\d+)/i);
    if (gMatch) return `G${gMatch[1]}`;
    const kt = extractKtFromItem(itemVal);
    if (kt) return `G${kt.replace(/KT$/i, '')}`;
    return itemVal;
  }
  return '';
};

/**
 * Dynamically resolves full display code (e.g. "RGR01504 – G18 ROSE")
 */
export const getStyleDisplayCode = (style) => {
  if (!style) return '';
  const baseCode = (style.styleCode || '').trim();
  const itemVal = getStyleItem(style);
  if (!itemVal) return baseCode;

  const normBase = baseCode.toUpperCase();
  const normItem = itemVal.toUpperCase();
  if (
    normBase.endsWith(normItem) ||
    normBase.endsWith(`-${normItem}`) ||
    normBase.endsWith(`_${normItem}`) ||
    normBase.includes(`– ${normItem}`) ||
    normBase.includes(`- ${normItem}`)
  ) {
    return baseCode;
  }
  return `${baseCode} – ${itemVal}`;
};

/**
 * Extracts all distinct stock KT / item purities for a given style on client-side.
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
 * Checks whether style.images contains uploaded photos for a specific KT on client-side
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

export const isKtPendingForStyle = (style, kt) => {
  if (!style) return false;
  if (Array.isArray(style.pendingKts) && style.pendingKts.length > 0) {
    return style.pendingKts.includes(kt) && !hasPhotosForKt(style.images, kt);
  }
  return !hasPhotosForKt(style.images, kt);
};

/**
 * Resolves the list of pending KTs for a style.
 * Uses style.pendingKts if available, or calculates it dynamically.
 */
export const getPendingKtsForStyle = (style, availableKts = []) => {
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

  // Helper to validate and sort an array of image objects
  const filterValid = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((img) => img && typeof img.url === 'string' && img.url.trim().length > 0)
      .sort((a, b) => (Number(a.slot) || 1) - (Number(b.slot) || 1));
  };

  // If style has flat images array
  if (Array.isArray(style.images)) {
    const valid = filterValid(style.images);
    if (valid.length > 0) return valid;
  }

  // If style.images is an object with KT keys
  if (style.images && typeof style.images === 'object') {
    const imagesObj = style.images;

    // Collect candidate keys in order of priority
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

    const styleItem = getStyleItem(style);
    if (styleItem && !candidates.includes(styleItem)) {
      candidates.push(styleItem);
      const normStyle = extractKtFromItem(styleItem);
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

  // Direct image URL fallbacks if present on style object
  if (style.imageUrl && typeof style.imageUrl === 'string' && style.imageUrl.trim()) {
    return [{ slot: 1, url: style.imageUrl.trim() }];
  }
  if (style.image && typeof style.image === 'string' && style.image.trim()) {
    return [{ slot: 1, url: style.image.trim() }];
  }

  return [];
};

/**
 * Returns primary image URL or fallback for a style
 */
export const getPrimaryImageUrl = (style, targetKt = null) => {
  const images = resolveStyleImages(style, targetKt);
  return images[0]?.url || '';
};



