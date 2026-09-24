/**
 * Helper to format display code
 * e.g. Style ABC123 with Item G18 -> "ABC123 – G18"
 * Avoids duplicate suffix if already ending with item code
 */
export const formatDisplayCode = (styleCode, itemVal) => {
  const baseCode = (styleCode || '').trim();
  const item = (itemVal || '').trim();
  if (!item) return baseCode;

  const normBase = baseCode.toUpperCase();
  const normItem = item.toUpperCase();

  if (
    normBase.endsWith(normItem) ||
    normBase.includes(`– ${normItem}`) ||
    normBase.includes(`- ${normItem}`) ||
    normBase.endsWith(`-${normItem}`) ||
    normBase.endsWith(`_${normItem}`)
  ) {
    return baseCode;
  }

  return `${baseCode} – ${item}`;
};

import { extractKtFromItem } from './ktHelper.js';

/**
 * Normalizes item code from string (e.g. "G18 ROSE" -> "G18")
 */
export const extractItemCode = (str) => {
  if (!str) return '';
  const cand = String(str).trim();
  const gMatch = cand.match(/^G(\d+)/i);
  if (gMatch) return `G${gMatch[1]}`;
  const kt = extractKtFromItem(cand);
  if (kt) {
    const num = kt.replace(/[^\d]/g, '');
    return `G${num}`;
  }
  return cand;
};

/**
 * Expands an array of style documents for Customer Panel, Shared Links, and PDFs.
 * If a style has multiple itemVariants (e.g. G18, G20, G22), each variant is expanded
 * into a distinct, separate product entry with its own displayCode, gross weight, net weight,
 * purity, and stock quantity.
 *
 * For single-item styles or styles without variants, returns a single entry.
 * The Admin side remains completely untouched as it consumes the raw unexpanded Style documents.
 */
export const expandStylesForCustomer = (styles = []) => {
  const expanded = [];

  for (const style of styles) {
    const sObj = style.toObject ? style.toObject() : { ...style };
    const variants = Array.isArray(sObj.itemVariants) && sObj.itemVariants.length > 0
      ? sObj.itemVariants
      : null;

    if (variants && variants.length > 1) {
      // Multiple items for the same style code (e.g. G18, G20, G22)
      // -> Create a separate entry for each item variant
      for (let idx = 0; idx < variants.length; idx++) {
        const v = variants[idx];
        const vItem = v.item || v.itemCode || '';
        const vItemCode = v.itemCode || extractItemCode(vItem);
        const vPurity = v.purity || (vItem ? extractKtFromItem(vItem) : '') || sObj.purity || '';
        const vGross = v.grossWeight !== undefined && v.grossWeight !== null ? v.grossWeight : sObj.grossWeight;
        const vNet = v.netWeight !== undefined && v.netWeight !== null ? v.netWeight : sObj.netWeight;
        const vQty = v.qty !== undefined && v.qty !== null ? v.qty : 0;
        const displayCode = formatDisplayCode(sObj.styleCode, vItem || vItemCode);

        expanded.push({
          ...sObj,
          _id: `${sObj._id}_v${idx}`,
          styleId: sObj._id,
          styleCode: sObj.styleCode,
          item: vItem,
          itemCode: vItemCode,
          displayCode,
          purity: vPurity,
          grossWeight: vGross,
          netWeight: vNet,
          qty: vQty,
          rawData: v.rawData || sObj.rawData || {},
          images: sObj.images || {},
          lastExcelImportId: v.lastExcelImportId || sObj.lastExcelImportId
        });
      }
    } else {
      // Single item variant or style with no extra variants
      const singleVariant = variants && variants.length === 1 ? variants[0] : null;
      const vItem = singleVariant?.item || sObj.item || '';
      const vItemCode = singleVariant?.itemCode || sObj.itemCode || extractItemCode(vItem);
      const displayCode = formatDisplayCode(sObj.styleCode, vItem || vItemCode);

      expanded.push({
        ...sObj,
        _id: sObj._id,
        styleId: sObj._id,
        styleCode: sObj.styleCode,
        item: vItem,
        itemCode: vItemCode,
        displayCode,
        purity: singleVariant?.purity || (vItem ? extractKtFromItem(vItem) : '') || sObj.purity || '',
        grossWeight: singleVariant?.grossWeight !== undefined && singleVariant?.grossWeight !== null ? singleVariant.grossWeight : sObj.grossWeight,
        netWeight: singleVariant?.netWeight !== undefined && singleVariant?.netWeight !== null ? singleVariant.netWeight : sObj.netWeight,
        qty: singleVariant?.qty !== undefined && singleVariant?.qty !== null ? singleVariant.qty : sObj.qty,
        rawData: singleVariant?.rawData || sObj.rawData || {},
        images: sObj.images || {},
        lastExcelImportId: singleVariant?.lastExcelImportId || sObj.lastExcelImportId
      });
    }
  }

  return expanded;
};
