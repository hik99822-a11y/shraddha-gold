import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Style from '../models/Style.js';
import Category from '../models/Category.js';
import ExcelImport from '../models/ExcelImport.js';

dotenv.config();

export const runSyncSeparateItemEntries = async () => {
  try {
    console.log('Connecting to MongoDB...');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log('Connected to MongoDB successfully.');

    // 1. Drop legacy unique styleCode_1 index if present
    const collection = mongoose.connection.db.collection('styles');
    const existingIndexes = await collection.indexes();
    const legacyUniqueIdx = existingIndexes.find(
      (idx) => idx.name === 'styleCode_1' && idx.unique
    );
    if (legacyUniqueIdx) {
      console.log('Dropping legacy unique index: styleCode_1...');
      await collection.dropIndex('styleCode_1');
      console.log('Legacy styleCode_1 index dropped.');
    }

    // 2. Fetch latest completed import data
    const latestImport = await ExcelImport.findOne({ status: 'Completed' }).sort({ uploadDateTime: -1 });
    if (!latestImport || !Array.isArray(latestImport.data) || latestImport.data.length === 0) {
      console.log('No completed ExcelImport data found. Nothing to sync.');
      return;
    }
    console.log(`Found completed import "${latestImport.fileName}" with ${latestImport.data.length} rows.`);

    // 3. Cache all existing images by styleCode
    const existingStylesWithImages = await Style.find({
      $or: [
        { 'images.18KT.0': { $exists: true } },
        { 'images.20KT.0': { $exists: true } },
        { 'images.22KT.0': { $exists: true } }
      ]
    }).select('styleCode images');
    
    const styleImagesMap = new Map();
    for (const s of existingStylesWithImages) {
      if (s.images && !styleImagesMap.has(s.styleCode)) {
        styleImagesMap.set(s.styleCode, s.images);
      }
    }
    console.log(`Cached existing images for ${styleImagesMap.size} style codes.`);

    // 4. Group rows by styleCode + item
    const parsedEntries = new Map();
    const categoriesSet = new Set();

    for (const row of latestImport.data) {
      const rawCode = row.StyleCode || row.Style || row.ItemCode || row['Style Code'] || '';
      const styleCode = String(rawCode).trim().toUpperCase();
      if (!styleCode) continue;

      let categoryName = String(row.Category || row.CategoryName || 'General Jewellery').trim();
      if (!categoryName) categoryName = 'General Jewellery';
      categoriesSet.add(categoryName);

      const rawGross = row.GrossWt !== undefined && row.GrossWt !== '' ? row.GrossWt : row.GrossWeight;
      const grossWeight = parseFloat(String(rawGross || '0').replace(/[^0-9.]/g, '')) || 0;

      const rawNet = row.Wt !== undefined && row.Wt !== '' ? row.Wt : (row['Net Wt'] || row.NetWt || row.NetWeight);
      const netWeight = parseFloat(String(rawNet || '0').replace(/[^0-9.]/g, '')) || grossWeight;

      const rawQty = row.Qty !== undefined && row.Qty !== '' ? row.Qty : (row.Quantity || row.Stock || row.Pcs || 0);
      const qty = parseInt(String(rawQty || '0').replace(/[^0-9]/g, ''), 10) || 0;

      let itemVal = String(row.Item || row.ITEM || row.ItemName || '').trim();
      
      const candidatePurity = [
        String(row.Purity || ''),
        String(row.InwardSKUNo || ''),
        itemVal,
        String(row.Description || '')
      ].filter(Boolean).join(' ');

      let purity = '22 KT';
      if (/18\s*kt|18kt|\b18k\b|g18/i.test(candidatePurity)) purity = '18 KT';
      else if (/20\s*kt|20kt|\b20k\b|g20/i.test(candidatePurity)) purity = '20 KT';
      else if (/22\s*kt|22kt|\b22k\b|g22/i.test(candidatePurity)) purity = '22 KT';
      else if (/24\s*kt|24kt|\b24k\b|g24/i.test(candidatePurity)) purity = '24 KT';

      let itemCode = '';
      const candItem = `${itemVal} ${purity} ${row.InwardSKUNo || ''}`.toUpperCase();
      if (/G18|\b18\s*K\b|18KT/i.test(candItem)) itemCode = 'G18';
      else if (/G20|\b20\s*K\b|20KT/i.test(candItem)) itemCode = 'G20';
      else if (/G22|\b22\s*K\b|22KT/i.test(candItem)) itemCode = 'G22';
      else if (/G24|\b24\s*K\b|24KT/i.test(candItem)) itemCode = 'G24';
      else if (itemVal) itemCode = itemVal;

      if (!itemVal && itemCode) itemVal = itemCode;
      if (!itemVal) itemVal = purity;

      const description = String(row.Description || row.Remarks || '').trim();

      const entryKey = `${styleCode}:::${itemVal.toUpperCase()}`;
      if (!parsedEntries.has(entryKey)) {
        parsedEntries.set(entryKey, {
          styleCode,
          item: itemVal,
          itemCode,
          categoryName,
          grossWeight,
          netWeight,
          purity,
          description,
          qty,
          rawData: row
        });
      } else {
        const existing = parsedEntries.get(entryKey);
        existing.qty = (existing.qty || 0) + qty;
      }
    }

    console.log(`Identified ${parsedEntries.size} distinct product entries (StyleCode + Item).`);

    // 5. Ensure categories exist
    const categoryMap = new Map();
    for (const catName of categoriesSet) {
      const normalizedCat = catName.trim().toLowerCase();
      let category = await Category.findOne({ normalizedName: normalizedCat });
      if (!category) {
        category = await Category.create({
          name: catName.trim(),
          normalizedName: normalizedCat,
          description: `Auto-created during migration`
        });
      }
      categoryMap.set(normalizedCat, category);
    }

    // 6. Build and execute bulk operations
    const bulkOps = [];
    for (const item of parsedEntries.values()) {
      const catDoc = categoryMap.get(item.categoryName.toLowerCase());
      const inheritedImages = styleImagesMap.get(item.styleCode) || {
        '18KT': [],
        '20KT': [],
        '22KT': []
      };

      bulkOps.push({
        updateOne: {
          filter: { styleCode: item.styleCode, item: item.item },
          update: {
            $set: {
              styleCode: item.styleCode,
              item: item.item,
              itemCode: item.itemCode,
              category: catDoc ? catDoc._id : null,
              categoryName: item.categoryName,
              grossWeight: item.grossWeight,
              netWeight: item.netWeight,
              qty: item.qty,
              purity: item.purity,
              description: item.description,
              rawData: item.rawData,
              status: 'Active',
              lastExcelImportId: latestImport._id
            },
            $setOnInsert: {
              images: inheritedImages
            }
          },
          upsert: true
        }
      });
    }

    console.log(`Writing ${bulkOps.length} operations in chunks...`);
    const CHUNK_SIZE = 500;
    for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
      await Style.bulkWrite(chunk, { ordered: false });
      console.log(`Processed chunk ${Math.min(i + CHUNK_SIZE, bulkOps.length)} / ${bulkOps.length}`);
    }

    // 7. Update Category item counts
    const allCats = await Category.find();
    for (const cat of allCats) {
      const count = await Style.countDocuments({ category: cat._id, status: 'Active' });
      await Category.findByIdAndUpdate(cat._id, { itemCount: count });
    }

    const totalStylesNow = await Style.countDocuments();
    console.log(`Migration complete! Total styles now in database: ${totalStylesNow}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('syncSeparateItemEntries.js')) {
  runSyncSeparateItemEntries()
    .then(() => {
      console.log('Migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
