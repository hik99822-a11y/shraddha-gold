import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Style from '../models/Style.js';

dotenv.config();

const runMigration = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');

    const styles = await Style.find({ rawData: { $exists: true } });
    console.log(`Found ${styles.length} styles with rawData.`);

    const bulkOps = [];
    let netWeightUpdated = 0;
    let purityUpdated = 0;
    let grossWeightUpdated = 0;

    for (const style of styles) {
      const row = style.rawData || {};
      const updates = {};

      // 1. Gross Weight from rawData.GrossWt if different
      if (row.GrossWt !== undefined && row.GrossWt !== null && row.GrossWt !== '') {
        const parsedGross = parseFloat(String(row.GrossWt).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedGross) && parsedGross > 0 && Math.abs(parsedGross - style.grossWeight) > 0.0001) {
          updates.grossWeight = parsedGross;
          grossWeightUpdated++;
        }
      }

      // 2. Net Weight from rawData.Wt or rawData['Net Wt'] or rawData.NetWt
      const rawNet = row.Wt !== undefined && row.Wt !== null && row.Wt !== '' ? row.Wt : (row['Net Wt'] || row.NetWt);
      if (rawNet !== undefined && rawNet !== null && rawNet !== '') {
        const parsedNet = parseFloat(String(rawNet).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedNet) && Math.abs(parsedNet - style.netWeight) > 0.0001) {
          updates.netWeight = parsedNet;
          netWeightUpdated++;
        }
      }

      // 3. Purity from InwardSKUNo, Item, Purity, or description
      const candidates = [
        String(row.Purity || ''),
        String(row.InwardSKUNo || ''),
        String(row.Item || ''),
        String(style.description || '')
      ].filter(Boolean).join(' ');

      let detectedPurity = null;
      if (/18\s*kt|18kt|\b18k\b|g18/i.test(candidates)) detectedPurity = '18 KT';
      else if (/20\s*kt|20kt|\b20k\b|g20/i.test(candidates)) detectedPurity = '20 KT';
      else if (/22\s*kt|22kt|\b22k\b|g22/i.test(candidates)) detectedPurity = '22 KT';
      else if (/24\s*kt|24kt|\b24k\b|g24/i.test(candidates)) detectedPurity = '24 KT';

      if (detectedPurity && detectedPurity !== style.purity) {
        updates.purity = detectedPurity;
        purityUpdated++;
      }

      // 4. Qty from rawData.Qty or rawData.Quantity or rawData.Stock or rawData.Pcs
      if (style.qty === undefined || style.qty === null || style.qty === 0) {
        const rawQty = row.Qty !== undefined && row.Qty !== '' ? row.Qty : (row.Quantity || row.Stock || row.Pcs || row.PCS);
        if (rawQty !== undefined && rawQty !== null && rawQty !== '') {
          const parsedQty = parseInt(String(rawQty).replace(/[^0-9]/g, ''), 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            updates.qty = parsedQty;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { _id: style._id },
            update: { $set: updates }
          }
        });
      }
    }

    console.log(`Prepared ${bulkOps.length} updates:`);
    console.log(`- Net weights updated: ${netWeightUpdated}`);
    console.log(`- Purities updated: ${purityUpdated}`);
    console.log(`- Gross weights updated: ${grossWeightUpdated}`);

    const CHUNK_SIZE = 500;
    for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) {
        await Style.bulkWrite(chunk, { ordered: false });
        console.log(`Processed chunk ${Math.min(i + CHUNK_SIZE, bulkOps.length)} / ${bulkOps.length}`);
      }
    }

    console.log('Migration complete successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

runMigration();
