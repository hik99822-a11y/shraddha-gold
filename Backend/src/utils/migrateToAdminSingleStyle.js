import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Style from '../models/Style.js';
import ExcelImport from '../models/ExcelImport.js';
import Category from '../models/Category.js';
import { extractItemCode } from './styleCustomerExpansion.js';

dotenv.config();

async function migrate() {
  console.log('--- STARTING MIGRATION TO ADMIN SINGLE STYLE (4,839 UNIQUE STYLES) ---');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold');
  console.log('Connected to MongoDB');

  // 1. Gather all existing slot images across current Style records
  const existingStyles = await Style.find({}).select('styleCode images item');
  const imagesByStyleCode = new Map();
  for (const s of existingStyles) {
    if (s.images && !imagesByStyleCode.has(s.styleCode)) {
      const hasAny = Object.values(s.images).some((arr) => Array.isArray(arr) && arr.length > 0);
      if (hasAny) {
        imagesByStyleCode.set(s.styleCode, s.images);
      }
    }
  }
  console.log(`Preserved image maps for ${imagesByStyleCode.size} style codes`);

  // 2. Fetch latest completed import data (6,048 rows)
  const latestImport = await ExcelImport.findOne({ status: 'Completed' }).sort({ uploadDateTime: -1 });
  if (!latestImport || !Array.isArray(latestImport.data) || latestImport.data.length === 0) {
    throw new Error('No completed ExcelImport with data found!');
  }
  console.log(`Processing ${latestImport.data.length} rows from import: ${latestImport.fileName}`);

  // 3. Drop legacy index styleCode_1_item_1
  try {
    await mongoose.connection.db.collection('styles').dropIndex('styleCode_1_item_1');
    console.log('Dropped index styleCode_1_item_1');
  } catch (e) {
    console.log('Index styleCode_1_item_1 not present or already dropped');
  }

  // 4. Group rows by styleCode strictly (4,839 styles)
  // Inside each style, populate itemVariants by item
  const styleCodeMap = new Map();

  for (const rowData of latestImport.data) {
    const rawStyleCode = rowData['Style Code'] || rowData['StyleCode'] || rowData['ItemCode'] || rowData['InwardSKUNo'];
    const styleCode = rawStyleCode ? String(rawStyleCode).trim().toUpperCase() : '';
    if (!styleCode) continue;

    let categoryName = String(rowData['Category'] || rowData['CategoryName'] || 'General Jewellery').trim();
    const grossWtStr = String(rowData['GrossWt'] || rowData['Gross Wt'] || rowData['Wt'] || '0').replace(/[^0-9.]/g, '');
    const grossWeight = parseFloat(grossWtStr) || 0;

    const netWtStr = String(rowData['Net Wt'] || rowData['NetWt'] || rowData['Wt'] || grossWtStr).replace(/[^0-9.]/g, '');
    const netWeight = parseFloat(netWtStr) || grossWeight;

    let purity = '22 KT';
    const explicitPurity = String(rowData['Purity'] || '').trim();
    const candidateStrings = [
      explicitPurity,
      String(rowData['InwardSKUNo'] || ''),
      String(rowData['Item'] || ''),
      String(rowData['Purity'] || '')
    ].filter(Boolean);

    for (const cand of candidateStrings) {
      if (/18\s*kt|18kt|\b18k\b|g18/i.test(cand)) { purity = '18 KT'; break; }
      if (/20\s*kt|20kt|\b20k\b|g20/i.test(cand)) { purity = '20 KT'; break; }
      if (/22\s*kt|22kt|\b22k\b|g22/i.test(cand)) { purity = '22 KT'; break; }
      if (/24\s*kt|24kt|\b24k\b|g24/i.test(cand)) { purity = '24 KT'; break; }
    }
    if (!purity && explicitPurity) purity = explicitPurity;

    let itemVal = String(rowData['Item'] || rowData['ITEM'] || '').trim();
    const itemCode = extractItemCode(`${itemVal} ${purity} ${rowData['InwardSKUNo'] || ''}`);
    if (!itemVal && itemCode) itemVal = itemCode;

    const qtyStr = String(rowData['Qty'] || rowData['Quantity'] || rowData['Stock'] || '1').replace(/[^0-9.]/g, '');
    const qty = parseInt(qtyStr, 10) || 1;

    const variantKey = (itemVal || purity).toUpperCase();

    if (!styleCodeMap.has(styleCode)) {
      const variantsMap = new Map();
      variantsMap.set(variantKey, {
        item: itemVal,
        itemCode,
        purity,
        grossWeight,
        netWeight,
        qty,
        rawData: rowData
      });

      styleCodeMap.set(styleCode, {
        styleCode,
        item: itemVal,
        itemCode,
        categoryName,
        grossWeight,
        netWeight,
        purity,
        description: String(rowData['Description'] || '').trim(),
        rawData: rowData,
        variantsMap
      });
    } else {
      const existing = styleCodeMap.get(styleCode);
      if (existing.variantsMap.has(variantKey)) {
        const v = existing.variantsMap.get(variantKey);
        v.qty = (v.qty || 0) + qty;
      } else {
        existing.variantsMap.set(variantKey, {
          item: itemVal,
          itemCode,
          purity,
          grossWeight,
          netWeight,
          qty,
          rawData: rowData
        });
      }
    }
  }

  console.log(`Aggregated into ${styleCodeMap.size} unique style codes (Expected: 4,839)`);

  // 5. Fetch all categories to map category ObjectId
  const allCategories = await Category.find();
  const catMap = new Map();
  allCategories.forEach((c) => catMap.set(c.normalizedName, c._id));

  // 6. Build document list
  const documentsToInsert = [];
  for (const style of styleCodeMap.values()) {
    const itemVariants = Array.from(style.variantsMap.values());
    const totalQty = itemVariants.reduce((sum, v) => sum + (v.qty || 0), 0);
    const catId = catMap.get(style.categoryName.toLowerCase()) || null;

    const preservedImages = imagesByStyleCode.get(style.styleCode) || {
      '18KT': [],
      '20KT': [],
      '22KT': []
    };

    documentsToInsert.push({
      styleCode: style.styleCode,
      item: style.item,
      itemCode: style.itemCode,
      category: catId,
      categoryName: style.categoryName,
      grossWeight: style.grossWeight,
      netWeight: style.netWeight,
      purity: style.purity,
      description: style.description,
      qty: totalQty,
      status: 'Active',
      lastExcelImportId: latestImport._id,
      images: preservedImages,
      itemVariants,
      rawData: style.rawData,
      customAttributes: {}
    });
  }

  // 7. Clear Style collection and reinsert
  console.log(`Clearing ${await Style.countDocuments()} existing Style records...`);
  await Style.deleteMany({});

  console.log(`Inserting ${documentsToInsert.length} unique style documents...`);
  const CHUNK_SIZE = 500;
  for (let i = 0; i < documentsToInsert.length; i += CHUNK_SIZE) {
    const chunk = documentsToInsert.slice(i, i + CHUNK_SIZE);
    await Style.insertMany(chunk, { ordered: false });
  }

  // 8. Re-create unique index on styleCode
  try {
    await mongoose.connection.db.collection('styles').dropIndex('styleCode_1');
  } catch (e) {
    // ignore
  }
  await mongoose.connection.db.collection('styles').createIndex({ styleCode: 1 }, { unique: true });
  console.log('Ensured unique index on styleCode');

  // 9. Verify counts
  const finalCount = await Style.countDocuments();
  console.log(`Final count in Style collection: ${finalCount}`);

  const multiItemSample = await Style.findOne({ 'itemVariants.1': { $exists: true } });
  console.log('Sample style with multiple variants:');
  console.log(`- Style: ${multiItemSample.styleCode}`);
  console.log(`- Variants count: ${multiItemSample.itemVariants.length}`);
  multiItemSample.itemVariants.forEach((v, idx) => {
    console.log(`  [${idx}] Item: ${v.item} (${v.itemCode}), Purity: ${v.purity}, GrossWt: ${v.grossWeight}g, Qty: ${v.qty}`);
  });

  console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
