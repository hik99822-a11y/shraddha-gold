import mongoose from 'mongoose';

const excelImportSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDateTime: {
      type: Date,
      default: Date.now,
      index: true
    },
    totalRows: {
      type: Number,
      default: 0
    },
    newRecords: {
      type: Number,
      default: 0
    },
    updatedRecords: {
      type: Number,
      default: 0
    },
    unchangedRecords: {
      type: Number,
      default: 0
    },
    failedRows: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      default: 'Processing',
      index: true
    },
    detectedColumns: [
      {
        type: String
      }
    ],
    detectedKts: [
      {
        type: String
      }
    ],
    detectedItems: [
      {
        type: String
      }
    ],
    errorLogs: [
      {
        row: Number,
        styleCode: String,
        error: String
      }
    ],
    // The imported Excel data stored as an array of objects: [{ key: value }]
    data: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    isLatest: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'excelimports'
  }
);

excelImportSchema.index({ isLatest: 1, uploadDateTime: -1 });

const ExcelImport = mongoose.model('ExcelImport', excelImportSchema);

export default ExcelImport;
