import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { extractKtFromItem, resolveStyleImages } from '../utils/ktHelper.js';
import { configService } from './configService.js';
import { formatDateIST, formatDateTimeIST } from '../utils/dateUtils.js';
import { fileURLToPath } from 'url';
import Style from '../models/Style.js';
import { expandStylesForCustomer } from '../utils/styleCustomerExpansion.js';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow Sharp to use multiple threads for fast compression when needed.
// We will rely on dynamic batch sizing below to protect the server CPU instead.
sharp.concurrency();
const uploadsDir = (process.env.DESKTOP_SERVER_DIR && fs.existsSync(process.env.DESKTOP_SERVER_DIR))
  ? process.env.DESKTOP_SERVER_DIR
  : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Helper: Extract purity from style data
 */
const extractPurity = (style) => {
  if (!style) return '';
  const row = style.rawData || {};
  const cand = [row.Item, row.ITEM, style.item, row.Purity, row.InwardSKUNo, style.purity, style.description]
    .filter(Boolean)
    .join(' ');
  const ext = extractKtFromItem(cand);
  if (ext) return ext;
  return (style.purity ? style.purity.replace(/\s+/g, '') : '');
};

/**
 * Helper: Extract gross weight from raw data
 */
const extractGrossWeight = (style) => {
  const row = style.rawData || {};
  const rawVal = row.GrossWt !== undefined && row.GrossWt !== '' ? row.GrossWt : style.grossWeight;
  const n = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
  return !isNaN(n) ? n : (Number(style.grossWeight) || 0);
};

/**
 * Helper: Extract net weight from raw data
 */
const extractNetWeight = (style) => {
  const row = style.rawData || {};
  const rawVal = row.Wt !== undefined && row.Wt !== '' ? row.Wt : (row['Net Wt'] || row.NetWt || style.netWeight);
  const n = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
  return !isNaN(n) ? n : (Number(style.netWeight) || 0);
};

/**
 * Helper: Resolve image file path on disk
 */
const resolveImagePath = async (imgUrl, uploadsRoot) => {
  if (!imgUrl) return null;
  try {
    let fullImgPath;
    const desktopServerDir = process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';
    const desktopServerUrl = configService.get('DESKTOP_SERVER_URL');
    
    const isUploads = imgUrl.startsWith('/uploads/');
    const isServerImages = imgUrl.startsWith('/server-images/');

    if (isUploads || isServerImages) {
      if (desktopServerUrl) {
        const remotePath = isUploads ? imgUrl.replace('/uploads', '') : imgUrl.replace('/server-images', '');
        const remoteUrl = `${desktopServerUrl}${remotePath}`;
        try {
          const response = await fetch(remoteUrl, {
            headers: {
              'bypass-tunnel-reminder': 'true',
              'User-Agent': 'ShraddhaGold-PDFGenerator/1.0'
            }
          });
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
          }
        } catch (err) {
          console.error(`[PDF Image Fetch Error] ${remoteUrl}:`, err.message);
        }
        return null;
      } else {
        const localPathPart = isUploads ? imgUrl.replace('/uploads/', '') : imgUrl.replace('/server-images/', '');
        fullImgPath = path.join(desktopServerDir, localPathPart);
      }
    } else {
      const cleanUrl = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl;
      fullImgPath = path.join(uploadsRoot, cleanUrl);
    }
    try {
      await fs.promises.access(fullImgPath, fs.constants.F_OK);
      return fullImgPath;
    } catch {
      return null;
    }
  } catch (e) { /* ignore */ }
  return null;
};

/**
 * Helper: Optimize image based on requested quality
 * - 'original' / 'full': Original image resolution, NO compression
 * - 'print' / '600dpi': 600 DPI (~3900px, 95% JPEG quality)
 * - 'high' / '300dpi': 300 DPI (~2000px, 88% JPEG quality)
 * - 'medium' / '150dpi': 150 DPI (~1000px, 80% JPEG quality)
 * - 'low' / '72dpi': 72 DPI (~500px, 65% JPEG quality)
 */
const optimizeImageForQuality = async (imagePath, quality = 'original') => {
  if (!imagePath) return null;
  try {
    await fs.promises.access(imagePath, fs.constants.F_OK);
  } catch {
    return null;
  }

  const q = String(quality || 'original').toLowerCase().trim();

  // 1. Original / Full Quality: Original image resolution, NO compression
  if (q === 'original' || q === 'full' || q === 'none') {
    return imagePath;
  }

  try {
    const ext = path.extname(imagePath).toLowerCase();
    const hash = `${path.basename(imagePath, ext)}_${q}.jpg`;
    const tempOptimizedDir = path.join(uploadsDir, 'cache');
    if (!fs.existsSync(tempOptimizedDir)) {
      fs.mkdirSync(tempOptimizedDir, { recursive: true });
    }
    const optimizedPath = path.join(tempOptimizedDir, hash);

    if (fs.existsSync(optimizedPath)) {
      return optimizedPath;
    }

    let pipeline = sharp(imagePath);

    if (q === 'print' || q === '600' || q === '600dpi') {
      // 600 DPI: Ultra-high print quality
      pipeline = pipeline
        .resize(3900, 3900, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 95, mozjpeg: true });
    } else if (q === 'high' || q === '300' || q === '300dpi') {
      // 300 DPI: High resolution
      pipeline = pipeline
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true });
    } else if (q === 'medium' || q === '150' || q === '150dpi') {
      // 150 DPI: Medium standard resolution
      pipeline = pipeline
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true });
    } else if (q === 'low' || q === '72' || q === '72dpi' || q === 'compact') {
      // 72 DPI: Low resolution web/mobile
      pipeline = pipeline
        .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 65, mozjpeg: true });
    } else {
      // Default fallback
      return imagePath;
    }

    await pipeline.toFile(optimizedPath);
    
    // Auto-delete optimized image cache after 5 minutes
    setTimeout(() => {
      if (fs.existsSync(optimizedPath)) {
        try { fs.unlinkSync(optimizedPath); } catch (e) {}
      }
    }, 5 * 60 * 1000);

    return optimizedPath;
  } catch (err) {
    console.warn('[optimizeImageForQuality Warning]:', err.message);
    return imagePath;
  }
};

/**
 * Helper: Extract normalized item code (G18, G20, G22, etc.)
 */
const getStyleItemCode = (style) => {
  if (!style) return '';
  if (style.itemCode) return style.itemCode;
  const row = style.rawData || {};
  const cand = [style.item, row.Item, row.InwardSKUNo, style.purity, row.Purity].filter(Boolean).join(' ').toUpperCase();
  const kt = extractKtFromItem(cand);
  if (kt) {
    return `G${kt.replace(/KT$/i, '')}`;
  }
  return style.item || row.Item || '';
};

/**
 * Helper: Format full display code (e.g. ABC123 – G18)
 */
const getStyleDisplayCode = (style) => {
  if (!style) return '';
  const baseCode = (style.styleCode || '').trim();
  const row = style.rawData || {};
  const itemVal = (style.item || row.Item || getStyleItemCode(style) || '').trim();
  if (!itemVal) return baseCode;

  const normBase = baseCode.toUpperCase();
  const normItem = itemVal.toUpperCase();
  if (
    normBase.endsWith(normItem) ||
    normBase.includes(`– ${normItem}`) ||
    normBase.includes(`- ${normItem}`) ||
    normBase.endsWith(`-${normItem}`) ||
    normBase.endsWith(`_${normItem}`)
  ) {
    return baseCode;
  }
  return `${baseCode} – ${itemVal}`;
};

/**
 * Generates an executive luxury PDF catalog following the single-product-per-page reference design:
 * - Logo in the PDF header
 * - Large bordered black rectangular frame for product image
 * - Standardized bordered specification table below (Style : | StyleCode | KT \n Gross Wt : | XX.XXX gms)
 * - Page : X / Total at bottom-right
 * - Generated according to user-selected quality ('high', 'medium', 'low')
 */
export const generateStylesPdf = async ({
  type,
  targetId,
  targetName,
  styleQuery = {},
  allowedKts = [],
  categoryKts = {},
  quality = 'original',
  res
}) => {
  const fileName = `SG_Catalog_${type}_${Date.now()}.pdf`;

  // Query styles
  const rawStyles = await Style.find({ ...styleQuery, status: 'Active' })
    .sort({ categoryName: 1, styleCode: 1 })
    .limit(1000);

  // Expand items/KT variants into separate product entries for Catalog PDF
  let styles = expandStylesForCustomer(rawStyles);

  // Filter by category-specific KTs or global allowed KTs
  const hasCategoryKts = categoryKts && typeof categoryKts === 'object' && Object.keys(categoryKts).length > 0;
  if (hasCategoryKts) {
    styles = styles.filter((s) => {
      const catKey = s.categoryName ? s.categoryName.trim() : '';
      const catIdKey = s.category ? String(s.category) : '';
      const allowedForCat = categoryKts[catKey] || categoryKts[catIdKey];
      if (Array.isArray(allowedForCat) && allowedForCat.length > 0) {
        const normAllowed = allowedForCat.map((k) => k.replace(/\s*KT/i, '').trim().toUpperCase());
        const p = (extractPurity(s) || s.purity || '').replace(/\s*KT/i, '').trim().toUpperCase();
        const cand = `${s.item || ''} ${s.itemCode || ''} ${p}`.toUpperCase();
        return normAllowed.some((kt) => cand.includes(kt));
      }
      // Fallback to global allowedKts if category not found in categoryKts
      if (Array.isArray(allowedKts) && allowedKts.length > 0 && !allowedKts.includes('All') && !allowedKts.includes('all')) {
        const normAllowed = allowedKts.map((k) => k.replace(/\s*KT/i, '').trim().toUpperCase());
        const p = (extractPurity(s) || s.purity || '').replace(/\s*KT/i, '').trim().toUpperCase();
        const cand = `${s.item || ''} ${s.itemCode || ''} ${p}`.toUpperCase();
        return normAllowed.some((kt) => cand.includes(kt));
      }
      return true;
    });
  } else if (Array.isArray(allowedKts) && allowedKts.length > 0 && !allowedKts.includes('All') && !allowedKts.includes('all')) {
    const normAllowed = allowedKts.map((k) => k.replace(/\s*KT/i, '').trim().toUpperCase());
    styles = styles.filter((s) => {
      const p = (extractPurity(s) || s.purity || '').replace(/\s*KT/i, '').trim().toUpperCase();
      const cand = `${s.item || ''} ${s.itemCode || ''} ${p}`.toUpperCase();
      return normAllowed.some((kt) => cand.includes(kt));
    });
  }

  const uploadsRoot = process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';

  // Helper for batch processing to massively speed up PDF generation
  const processInBatches = async (itemsArray, batchSize, processFn) => {
    const results = [];
    for (let i = 0; i < itemsArray.length; i += batchSize) {
      const batch = itemsArray.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processFn));
      results.push(...batchResults);
    }
    return results;
  };

  // DYNAMIC BATCH SIZING based on Export Quality Profile
  // Low/Medium/Original take very little CPU/RAM to process (Original skips Sharp entirely), 
  // so we process 25 at a time for lightning fast speed.
  // High/Print take massive CPU/RAM for Sharp resizing, so we throttle to 5 at a time to prevent server crashes.
  const q = String(quality || 'original').toLowerCase().trim();
  const dynamicBatchSize = (q === 'low' || q === 'medium' || q === '72dpi' || q === '150dpi' || q === 'original' || q === 'full' || q === 'none') ? 25 : 5;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: true,
        info: {
          Title: `Shraddha Gold - ${targetName || 'Jewellery Catalog'}`,
          Author: "Shraddha Gold's India Pvt. Ltd.",
          Subject: 'Luxury Jewellery Manufacturing Catalog'
        }
      });

      if (res) {
        doc.pipe(res);
      } else {
        reject(new Error("Response object 'res' is required for streaming PDF"));
        return;
      }

      const pageW = doc.page.width;   // 595.28
      const pageH = doc.page.height;  // 841.89
      const totalPages = Math.max(1, styles.length);
      const logoCandidates = [
        path.join(__dirname, '../assets/Shraddha Gold India Pvt. Ltd - Black (1).png'),
        path.join(__dirname, '../../../Frontend/public/Shraddha Gold India Pvt. Ltd - Black (1).png'),
        path.join(__dirname, '../assets/logo-black.png'),
        path.join(__dirname, '../assets/logo-horizontal.png')
      ];
      const logoPath = logoCandidates.find(p => fs.existsSync(p));

      if (styles.length === 0) {
        // Render single page when no products match
        if (logoPath) {
          const logoH = 46;
          const logoW = Math.round(logoH * (20000 / 11006));
          const logoX = Math.round((pageW - logoW) / 2);
          doc.image(logoPath, logoX, 16, { width: logoW, height: logoH });
        }
        doc.fillColor('#666666').fontSize(14).font('Helvetica')
          .text('No product styles found for selected criteria.', 0, 320, { width: pageW, align: 'center' });
      } else {
        // CHUNKING LOGIC FOR MASSIVE SPEEDUP: Dynamically read images concurrently from network
        const CHUNK_SIZE = dynamicBatchSize;
        for (let chunkStart = 0; chunkStart < styles.length; chunkStart += CHUNK_SIZE) {
          const chunkStyles = styles.slice(chunkStart, chunkStart + CHUNK_SIZE);
          
          // Pre-process this chunk asynchronously in parallel batches
          const chunk = await Promise.all(chunkStyles.map(async (style) => {
            const detectedKt = extractPurity(style);
            const validImages = resolveStyleImages(style, detectedKt);
            const rawImgUrl = validImages.length > 0 ? validImages[0].url : (style.imageUrl || null);
            
            // Strip ?v= from URL before processing
            const cleanUrl = rawImgUrl ? rawImgUrl.split('?')[0] : null;
            
            const resolvedPath = await resolveImagePath(cleanUrl, uploadsRoot);
            let optimizedPath = null;
            if (resolvedPath) {
              optimizedPath = await optimizeImageForQuality(resolvedPath, quality);
            }

            // Determine purity / karat label (e.g. 18KTR, 20KT, 22KT)
            let ktText = detectedKt;
            const rawPurity = style.rawData?.Purity || style.rawData?.Item;
            if (rawPurity && String(rawPurity).trim()) {
              ktText = String(rawPurity).trim();
            } else if (style.item && !detectedKt.includes(style.item)) {
              ktText = `${detectedKt}${style.item}`;
            }

            const entry = {
              style,
              kt: detectedKt,
              ktText,
              imgPath: optimizedPath,
              styleCode: (style.styleCode || '').trim() || getStyleDisplayCode(style),
              displayCode: getStyleDisplayCode(style),
              grossWeight: extractGrossWeight(style),
              netWeight: extractNetWeight(style),
              categoryName: style.categoryName || 'Fine Jewellery'
            };

            // Concurrently fetch buffer for the chunk entry
            if (entry.imgPath) {
              try {
                entry.imgBuffer = await fs.promises.readFile(entry.imgPath);
              } catch(e) { entry.imgBuffer = null; }
            }
            return entry;
          }));


          // Render each product on its own single page (Reference Design)
          for (let j = 0; j < chunk.length; j++) {
            const i = chunkStart + j;
            if (i > 0) {
              doc.addPage();
            }

            const entry = chunk[j];

          // 1. HEADER: Shraddha Gold Logo (Horizontal)
          if (logoPath) {
            const logoH = 46;
            const logoW = Math.round(logoH * (20000 / 11006));
            const logoX = Math.round((pageW - logoW) / 2);
            doc.image(logoPath, logoX, 14, { width: logoW, height: logoH });
          } else {
            doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold')
              .text('SHRADDHA GOLD', 0, 24, { align: 'center', width: pageW });
          }

          // 2. PRODUCT IMAGE FRAME (Large Black Bordered Rectangular Box)
          const frameW = 490;
          const frameH = 500;
          const frameX = Math.round((pageW - frameW) / 2); // 53
          const frameY = 68;

          doc.rect(frameX, frameY, frameW, frameH)
            .lineWidth(1)
            .strokeColor('#000000')
            .stroke();

          // Render product image centered inside frame
          if (entry.imgBuffer) {
            const imgPad = 12;
            const maxImgW = frameW - (imgPad * 2);
            const maxImgH = frameH - (imgPad * 2);
            try {
              doc.image(entry.imgBuffer, frameX + imgPad, frameY + imgPad, {
                fit: [maxImgW, maxImgH],
                align: 'center',
                valign: 'center'
              });
              entry.imgBuffer = null; // free memory immediately
            } catch (imgErr) {
              console.warn('[PDF Image Embed Warning]:', imgErr.message);
              doc.fillColor('#888888').fontSize(12).font('Helvetica')
                .text('NO IMAGE', frameX, frameY + (frameH / 2) - 8, { width: frameW, align: 'center' });
            }
          } else {
            doc.fillColor('#888888').fontSize(12).font('Helvetica')
              .text('NO IMAGE', frameX, frameY + (frameH / 2) - 8, { width: frameW, align: 'center' });
          }

          // 3. PRODUCT SPECIFICATIONS TABLE (Matching Reference Image)
          const tableTopY = frameY + frameH + 18; // 586
          const col1W = 85;
          const col2W = 180;
          const col3W = 115;
          const tableW = col1W + col2W + col3W; // 380
          const tableX = Math.round((pageW - tableW) / 2); // 108
          const rowH = 24;

          // Row 1 Borders (Style : | StyleCode | KT)
          doc.rect(tableX, tableTopY, col1W, rowH).lineWidth(1).strokeColor('#000000').stroke();
          doc.rect(tableX + col1W, tableTopY, col2W, rowH).lineWidth(1).strokeColor('#000000').stroke();
          doc.rect(tableX + col1W + col2W, tableTopY, col3W, rowH).lineWidth(1).strokeColor('#000000').stroke();

          // Row 1 Content
          doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text('Style :', tableX, tableTopY + 7, { width: col1W, align: 'center' });

          doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text(entry.styleCode || entry.displayCode, tableX + col1W, tableTopY + 7, { width: col2W, align: 'center' });

          doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text(entry.ktText || entry.kt, tableX + col1W + col2W, tableTopY + 7, { width: col3W, align: 'center' });

          // Row 2 Borders (Gross Wt : | XX.XXX gms | Blank)
          const row2Y = tableTopY + rowH;
          doc.rect(tableX, row2Y, col1W, rowH).lineWidth(1).strokeColor('#000000').stroke();
          doc.rect(tableX + col1W, row2Y, col2W, rowH).lineWidth(1).strokeColor('#000000').stroke();
          doc.rect(tableX + col1W + col2W, row2Y, col3W, rowH).lineWidth(1).strokeColor('#000000').stroke();

          // Row 2 Content
          doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text('Gross Wt :', tableX, row2Y + 7, { width: col1W, align: 'center' });

          const grossWtText = entry.grossWeight > 0 ? `${entry.grossWeight.toFixed(3)} gms` : '—';
          doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
            .text(grossWtText, tableX + col1W + 10, row2Y + 7, { width: col2W - 10, align: 'left' });

          // 4. FOOTER: Page : 1/14 (Matching Reference Image)
          const footerY = pageH - 45;
          doc.fillColor('#000000').fontSize(9).font('Helvetica')
            .text(`Page :  ${i + 1} / ${totalPages}`, pageW - frameX - 140, footerY, {
              width: 140,
              align: 'right'
            });
          }
          
          // PREVENT OUT-OF-MEMORY (OOM) SERVER CRASH
          // Yield the Node.js event loop after every chunk to allow Garbage Collection 
          // and PDF disk stream flushing to catch up with our fast read speeds.
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      doc.end();

      res.on('finish', () => {
        resolve({
          fileName,
          itemCount: productEntries.length,
          quality,
          status: 'Completed'
        });
      });

      res.on('error', (err) => {
        console.error('[PDF Generation Stream Error]:', err);
        reject(err);
      });
    } catch (err) {
      console.error('[generateStylesPdf Error]:', err);
      reject(err);
    }
  });
};

/**
 * Generates an executive luxury PDF for an Order containing all products
 */
export const generateOrderPdf = async (order, res) => {
  const fileName = `SG_Order_${order.orderNumber}_${Date.now()}.pdf`;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Shraddha Gold Order - ${order.orderNumber}`,
          Author: 'Shraddha Gold India Pvt. Ltd.',
          Subject: `B2B Order Confirmation for ${order.customerName}`
        }
      });

      if (res) {
        doc.pipe(res);
      } else {
        reject(new Error("Response object 'res' is required for streaming PDF"));
        return;
      }

      const items = order.items || [];
      const uploadsRoot = process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';

      // --- 1. HEADER RENDERER (On Every Page) ---
      const drawHeader = () => {
        doc.rect(0, 0, doc.page.width, 68).fill('#ffffff');
        doc.rect(0, 68, doc.page.width, 2.5).fill('#B1D1CB'); // Brand Mint Line

        const orderLogoCandidates = [
          path.join(__dirname, '../assets/Shraddha Gold India Pvt. Ltd - Black (1).png'),
          path.join(__dirname, '../../../Frontend/public/Shraddha Gold India Pvt. Ltd - Black (1).png'),
          path.join(__dirname, '../assets/logo-black.png'),
          path.join(__dirname, '../assets/logo-horizontal.png')
        ];
        const logoPath = orderLogoCandidates.find(p => fs.existsSync(p));
        const logoH = 44;
        const logoW = Math.round(logoH * (20000 / 11006));
        const logoX = Math.round((doc.page.width - logoW) / 2);
        const logoY = Math.round((68 - logoH) / 2);

        if (logoPath) {
          doc.image(logoPath, logoX, logoY, { width: logoW, height: logoH });
        } else {
          doc.fillColor('#13392e').fontSize(18).font('Helvetica-Bold')
            .text('SHRADDHA GOLD', 40, 24, { align: 'center', width: doc.page.width - 80 });
        }
      };

      // --- 2. ORDER & CLIENT DOSSIER (ONLY ON MAIN / FIRST PAGE) ---
      const drawOrderInfoCard = (startY = 76) => {
        const cardW = 480;
        const cardX = Math.round((doc.page.width - cardW) / 2);
        const cardH = 44;
        doc.roundedRect(cardX, startY, cardW, cardH, 7).fillAndStroke('#f4f8f7', '#B1D1CB');

        // Left Column: Order Number & Date
        doc.fillColor('#4a756b').fontSize(7).font('Helvetica-Bold')
          .text('ORDER IDENTIFICATION', cardX + 14, startY + 8);
        doc.fillColor('#13392e').fontSize(10).font('Helvetica-Bold')
          .text(order.orderNumber || '—', cardX + 14, startY + 18);

        const dateStr = order.createdAt
          ? formatDateTimeIST(order.createdAt)
          : formatDateIST(new Date());
        doc.fillColor('#4a756b').fontSize(7.5).font('Helvetica')
          .text(`Date: ${dateStr}`, cardX + 14, startY + 31);

        // Right Column: Client & Contact
        const rightX = cardX + Math.round(cardW / 2) + 10;
        doc.fillColor('#4a756b').fontSize(7.5).font('Helvetica-Bold')
          .text('CLIENT & CONTACT DOSSIER', rightX, startY + 8);

        let custText = order.customerName || 'Direct Client';
        if (order.orderedBy && order.orderedBy !== order.customerName) {
          custText += ` (By: ${order.orderedBy})`;
        }
        doc.fillColor('#13392e').fontSize(10).font('Helvetica-Bold')
          .text(custText, rightX, startY + 18, { width: cardW / 2 - 24, lineBreak: false, ellipsis: true });

        const phoneText = order.customerPhone ? `Mobile: ${order.customerPhone}` : 'Mobile: —';
        doc.fillColor('#4a756b').fontSize(7.5).font('Helvetica')
          .text(phoneText, rightX, startY + 31);
      };


      // --- 3. PRODUCT ITEM RENDERER ---
      const drawProductItem = async (item, startY, imageSize = 195) => {
        const imageX = Math.round((doc.page.width - imageSize) / 2);
        const imageY = startY;

        // Image Frame
        doc.roundedRect(imageX, imageY, imageSize, imageSize, 8).fillAndStroke('#fbfdfc', '#B1D1CB');

        let hasImage = false;
        if (item.imgBuffer) {
          try {
            doc.image(item.imgBuffer, imageX + 6, imageY + 6, {
              fit: [imageSize - 12, imageSize - 12],
              align: 'center',
              valign: 'center'
            });
            hasImage = true;
            item.imgBuffer = null; // free memory immediately
          } catch (e) {
            // Ignore image load error
          }
        }

        if (!hasImage) {
          doc.fillColor('#6b8c85').fontSize(10).font('Helvetica-Bold')
            .text('NO IMAGE PREVIEW', imageX, imageY + (imageSize / 2) - 6, { width: imageSize, align: 'center' });
        }

        // Clean Style Code: avoid duplicate G22KT or purity suffix in the title
        const cleanStyleCode = item.styleCode || (item.displayCode ? item.displayCode.split('–')[0].split('-')[0].trim() : '—');
        const isLarge = imageSize >= 190;
        const titleY = imageY + imageSize + (isLarge ? 8 : 6);

        doc.fillColor('#13392e').fontSize(isLarge ? 14.5 : 12.5).font('Helvetica-Bold')
          .text(cleanStyleCode, 40, titleY, { align: 'center', width: doc.page.width - 80 });

        const catY = titleY + (isLarge ? 16 : 14);
        doc.fillColor('#4a756b').fontSize(isLarge ? 9.5 : 8.5).font('Helvetica')
          .text(item.categoryName || 'Fine Jewellery', 40, catY, { align: 'center', width: doc.page.width - 80 });

        // --- 3-COLUMN SPECIFICATIONS BAR: PURITY | GROSS WT | QUANTITY ---
        const specW = 480;
        const specX = Math.round((doc.page.width - specW) / 2);
        const specY = catY + (isLarge ? 10 : 8);
        const specH = isLarge ? 36 : 32;

        doc.roundedRect(specX, specY, specW, specH, 6).fillAndStroke('#f4f8f7', '#B1D1CB');

        const colW = specW / 3;
        doc.lineWidth(1);
        doc.moveTo(specX + colW, specY + 5).lineTo(specX + colW, specY + specH - 5).stroke('#DCE7E4');
        doc.moveTo(specX + colW * 2, specY + 5).lineTo(specX + colW * 2, specY + specH - 5).stroke('#DCE7E4');

        // Col 1: Purity
        const purityText = item.kt || item.purity || '22KT';
        doc.fillColor('#4a756b').fontSize(7).font('Helvetica-Bold')
          .text('PURITY', specX, specY + (isLarge ? 6 : 5), { width: colW, align: 'center' });
        doc.fillColor('#13392e').fontSize(isLarge ? 10.5 : 9).font('Helvetica-Bold')
          .text(purityText, specX, specY + (isLarge ? 18 : 16), { width: colW, align: 'center' });

        // Col 2: Gross Wt (Single clear gross weight)
        const grossWeightText = `${Number(item.grossWeight || 0).toFixed(2)} g`;
        doc.fillColor('#4a756b').fontSize(7).font('Helvetica-Bold')
          .text('GROSS WT', specX + colW, specY + (isLarge ? 6 : 5), { width: colW, align: 'center' });
        doc.fillColor('#13392e').fontSize(isLarge ? 10.5 : 9).font('Helvetica-Bold')
          .text(grossWeightText, specX + colW, specY + (isLarge ? 18 : 16), { width: colW, align: 'center' });

        // Col 3: Quantity
        const qtyText = `${item.quantity || 1} pcs`;
        doc.fillColor('#4a756b').fontSize(7).font('Helvetica-Bold')
          .text('QUANTITY', specX + colW * 2, specY + (isLarge ? 6 : 5), { width: colW, align: 'center' });
        doc.fillColor('#13392e').fontSize(isLarge ? 10.5 : 9).font('Helvetica-Bold')
          .text(qtyText, specX + colW * 2, specY + (isLarge ? 18 : 16), { width: colW, align: 'center' });

        // ITEM NOTE is completely removed per user request: "and ITEM NOTE remove this"
        return specY + specH;
      };

      // --- 4. RENDER LOOP (2 Products per Page; Order Dossier ONLY on Page 1) ---
      if (items.length === 0) {
        drawHeader();
        drawOrderInfoCard(76);
        doc.y = 170;
        doc.fillColor('#13392e').fontSize(15).font('Helvetica-Bold')
          .text('No Items Registered in Order', { align: 'center' });
      } else {
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / 2);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          if (pageIdx > 0) {
            doc.addPage();
          }

          // Header on every page
          drawHeader();

          const isFirstPage = (pageIdx === 0);
          const isLastPage = (pageIdx === totalPages - 1);
          const pageStartIndex = pageIdx * 2;
          const pageItems = items.slice(pageStartIndex, pageStartIndex + 2);
          const numItemsOnPage = pageItems.length;

          // Order & Client Dossier strictly on Page 1
          if (isFirstPage) {
            drawOrderInfoCard(76);
          }

          // Calculate dimensions and start positions so products fill the page without awkward empty space
          let imageSize;
          let startYList = [];

          if (numItemsOnPage === 1) {
            // 1 item on this page (e.g. 1-item order or odd final page)
            imageSize = isFirstPage ? 220 : 235;
            const startY = isFirstPage ? 136 : 96;
            startYList = [startY];
          } else {
            // 2 items on this page
            if (isLastPage) {
              // Final page with 2 items: must comfortably accommodate Final Order Summary banner below
              imageSize = isFirstPage ? 152 : 162;
              const startY1 = isFirstPage ? 128 : 86;
              const startY2 = isFirstPage ? 362 : 332;
              startYList = [startY1, startY2];
            } else {
              // Full 2-item page without summary: expand to fill the entire page beautifully
              imageSize = isFirstPage ? 200 : 210;
              const startY1 = isFirstPage ? 128 : 86;
              const startY2 = isFirstPage ? 456 : 436;
              startYList = [startY1, startY2];
            }
          }

          // CONCURRENT CHUNKING: Fetch the 1 or 2 images for this specific page concurrently 
          // before rendering, eliminating sequential network lag just like the Catalog PDFs.
          await Promise.all(pageItems.map(async (item) => {
            const cleanUrl = item.imageUrl ? item.imageUrl.split('?')[0] : null;
            const resolvedPath = await resolveImagePath(cleanUrl, uploadsRoot);
            if (resolvedPath) {
              try {
                item.imgBuffer = await fs.promises.readFile(resolvedPath);
              } catch (e) {}
            }
          }));

          let lastEndY = 0;
          for (let j = 0; j < numItemsOnPage; j++) {
            lastEndY = await drawProductItem(pageItems[j], startYList[j], imageSize);
          }

          // PREVENT OUT-OF-MEMORY (OOM) SERVER CRASH
          // Yield the Node.js event loop every 10 pages to allow Garbage Collection 
          // and PDF disk stream flushing to catch up with our fast read speeds.
          if (pageIdx > 0 && pageIdx % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // If this is the last page, render the Final Order Summary
          if (isLastPage) {
            const sumW = 480;
            const sumX = Math.round((doc.page.width - sumW) / 2);
            const sumH = 48;

            let summaryY;
            if (numItemsOnPage === 1) {
              summaryY = Math.max(lastEndY + 22, isFirstPage ? 465 : 435);
            } else {
              summaryY = lastEndY + 16;
            }

            // Summary Banner
            doc.roundedRect(sumX, summaryY, sumW, sumH, 6).fillAndStroke('#B1D1CB', '#95bbb4');

            doc.fillColor('#13392e').fontSize(7.5).font('Helvetica-Bold')
              .text('FINAL ORDER SUMMARY', sumX + 16, summaryY + 9);

            const totalDesigns = order.totalItems || items.length;
            const totalQty = order.totalQuantity || items.reduce((acc, it) => acc + (it.quantity || 1), 0);
            const summarySub = `Unique Designs: ${totalDesigns}   •   Total Quantity: ${totalQty} pcs`;
            doc.fillColor('#13392e').fontSize(9.5).font('Helvetica-Bold')
              .text(summarySub, sumX + 16, summaryY + 25);

            const totalWtText = `Total Gross Wt: ${Number(order.totalGrossWeight || 0).toFixed(2)} g`;
            doc.fillColor('#13392e').fontSize(11.5).font('Helvetica-Bold')
              .text(totalWtText, sumX, summaryY + 19, { width: sumW - 16, align: 'right' });

            let afterSumY = summaryY + sumH + 8;

            // Client Remark / Custom Instructions (Order level notes)
            const orderRemark = order.remark || order.notes;
            if (orderRemark) {
              doc.roundedRect(sumX, afterSumY, sumW, 26, 5).fillAndStroke('#fefce8', '#fde68a');
              doc.fillColor('#92400e').fontSize(7).font('Helvetica-Bold')
                .text('CLIENT REMARK:', sumX + 10, afterSumY + 7);
              doc.fillColor('#78350f').fontSize(7.5).font('Helvetica')
                .text(`"${orderRemark}"`, sumX + 110, afterSumY + 7, { width: sumW - 120, lineBreak: false, ellipsis: true });
              afterSumY += 32;
            }

            // Subtle verification footnote
            doc.fillColor('#6b8c85').fontSize(7).font('Helvetica')
              .text('Shraddha Gold India Pvt. Ltd.  •  Official CAD & B2B Production Specification', 40, afterSumY + 2, { align: 'center', width: doc.page.width - 80 });
          }
        }
      }

      // --- 5. FOOTER ON ALL PAGES ---
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.fillColor('#6b8c85').fontSize(7.5)
          .text(
            `Shraddha Gold  •  Order ${order.orderNumber}  •  Page ${i + 1} of ${pages.count}`,
            40,
            doc.page.height - 22,
            { align: 'center', width: doc.page.width - 80, lineBreak: false }
          );
        doc.page.margins.bottom = oldBottom;
      }

      doc.end();

      res.on('finish', () => {
        resolve({
          fileName,
          status: 'Completed'
        });
      });

      res.on('error', (err) => {
        console.error('[generateOrderPdf Stream Error]:', err);
        reject(err);
      });
    } catch (err) {
      console.error('[generateOrderPdf Error]:', err);
      reject(err);
    }
  });
};

