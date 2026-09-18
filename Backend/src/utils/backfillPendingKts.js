import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Style from '../models/Style.js';
import { calculateStylePendingKts, getActiveKtList } from './ktHelper.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold';

async function backfill() {
  try {
    console.log('[Backfill] Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('[Backfill] Connected successfully. Scanning styles...');

    const availableKts = await getActiveKtList();
    console.log('[Backfill] Active KT list:', availableKts);

    const styles = await Style.find({ status: { $in: ['Active', 'Removed from latest stock'] } });
    console.log(`[Backfill] Total styles found: ${styles.length}`);

    let completedCount = 0;
    let pendingCount = 0;
    const bulkOps = [];

    for (const style of styles) {
      const pendingKts = calculateStylePendingKts(style, availableKts);
      if (pendingKts.length === 0) {
        completedCount++;
      } else {
        pendingCount++;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: style._id },
          update: {
            $set: { pendingKts }
          }
        }
      });
    }

    console.log(`[Backfill] Categorized: ${completedCount} Fully Complete styles, ${pendingCount} styles with Pending KTs.`);
    console.log('[Backfill] Executing bulk write in chunks...');

    const CHUNK_SIZE = 500;
    for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
      const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
      await Style.bulkWrite(chunk, { ordered: false });
      console.log(`[Backfill] Processed ${Math.min(i + CHUNK_SIZE, bulkOps.length)} / ${bulkOps.length}`);
    }

    console.log('[Backfill] Successfully finished backfilling pendingKts on all styles!');
    process.exit(0);
  } catch (error) {
    console.error('[Backfill Error]:', error);
    process.exit(1);
  }
}

backfill();
