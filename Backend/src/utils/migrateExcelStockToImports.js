import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shraddha_gold';

async function migrate() {
  console.log(' Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);
  console.log(' Existing collections:', collectionNames);

  const hasStockItems = collectionNames.includes('excelstockitems');
  const hasImports = collectionNames.includes('excelimports');

  if (hasStockItems && hasImports) {
    console.log(' Checking records to migrate from excelstockitems to excelimports...');
    const importDocs = await db.collection('excelimports').find().toArray();

    for (const imp of importDocs) {
      if (!imp.data || imp.data.length === 0) {
        console.log(` Finding stock items for importId ${imp._id}...`);
        const stockItems = await db
          .collection('excelstockitems')
          .find({ importId: imp._id })
          .sort({ rowIndex: 1 })
          .toArray();

        if (stockItems.length > 0) {
          console.log(` Found ${stockItems.length} items for import ${imp.fileName}. Migrating to data array...`);
          const dataArray = stockItems.map((item) => item.data || {});

          await db.collection('excelimports').updateOne(
            { _id: imp._id },
            {
              $set: {
                data: dataArray,
                isLatest: true,
                totalRows: dataArray.length
              }
            }
          );
          console.log(` Successfully migrated ${dataArray.length} items into excelimports record ${imp._id}!`);
        }
      } else {
        console.log(` Import ${imp._id} already has ${imp.data.length} records in data array.`);
      }
    }

    console.log(' Dropping legacy collection: excelstockitems...');
    await db.collection('excelstockitems').drop();
    console.log(' Successfully dropped excelstockitems collection!');
  } else if (hasStockItems && !hasImports) {
    console.log(' Dropping orphaned excelstockitems collection...');
    await db.collection('excelstockitems').drop();
    console.log(' Successfully dropped excelstockitems collection!');
  } else {
    console.log(' No excelstockitems collection found or already dropped.');
  }

  // Final verification of collections
  const updatedCollections = await db.listCollections().toArray();
  const updatedNames = updatedCollections.map((c) => c.name);
  console.log(' Collections after migration:', updatedNames);

  const updatedImport = await db.collection('excelimports').findOne();
  if (updatedImport) {
    console.log(' Sample excelimports doc stats:', {
      _id: updatedImport._id,
      fileName: updatedImport.fileName,
      totalRows: updatedImport.totalRows,
      dataLength: updatedImport.data?.length,
      sampleDataRow: updatedImport.data?.[0]
    });
  }

  await mongoose.disconnect();
  console.log(' Migration completed successfully!');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
