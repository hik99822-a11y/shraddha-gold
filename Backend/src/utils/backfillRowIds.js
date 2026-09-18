import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold';

async function backfillRowIds() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const imports = await db.collection('excelimports').find().toArray();
  console.log(`Found ${imports.length} ExcelImport documents.`);

  for (const imp of imports) {
    if (Array.isArray(imp.data) && imp.data.length > 0) {
      let updatedCount = 0;
      const updatedData = imp.data.map((row) => {
        if (!row._id && !row.id) {
          updatedCount++;
          return {
            _id: new mongoose.Types.ObjectId().toString(),
            ...row
          };
        }
        return row;
      });

      if (updatedCount > 0) {
        console.log(`Updating ${updatedCount} rows in import ${imp._id} (${imp.fileName})...`);
        await db.collection('excelimports').updateOne(
          { _id: imp._id },
          { $set: { data: updatedData } }
        );
        console.log(`Successfully backfilled _id on ${updatedCount} rows for import ${imp._id}!`);
      } else {
        console.log(`Import ${imp._id} already has _id on all rows.`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Backfill completed successfully!');
}

backfillRowIds().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
