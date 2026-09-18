import mongoose from 'mongoose';

const imageSlotSchema = new mongoose.Schema(
  {
    slot: {
      type: Number,
      required: true,
      min: 1,
      max: 4
    },
    url: {
      type: String,
      required: true
    },
    originalFileName: {
      type: String,
      default: ''
    },
    storageKey: {
      type: String,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    // True if uploaded manually by user; protected from being overwritten by Desktop/server sync
    isRealImage: {
      type: Boolean,
      default: false
    },
    source: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const itemVariantSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      default: '',
      trim: true
    },
    itemCode: {
      type: String,
      default: '',
      trim: true
    },
    purity: {
      type: String,
      default: '22 KT'
    },
    grossWeight: {
      type: Number,
      default: 0
    },
    netWeight: {
      type: Number,
      default: 0
    },
    qty: {
      type: Number,
      default: 0
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const styleSchema = new mongoose.Schema(
  {
    styleCode: {
      type: String,
      required: [true, 'StyleCode is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    item: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    itemCode: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    grossWeight: {
      type: Number,
      default: 0
    },
    netWeight: {
      type: Number,
      default: 0
    },
    qty: {
      type: Number,
      default: 0
    },
    purity: {
      type: String,
      default: '22 KT'
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Removed from latest stock'],
      default: 'Active',
      index: true
    },
    lastExcelImportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExcelImport'
    },
    // Dynamic KT Image Structure: image slot arrays mapped by dynamic KT key (e.g. '18KT', '20KT', '22KT', '14KT', '24KT')
    images: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    customAttributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Item variants for Customer Panel, Shared Links, and PDFs
    itemVariants: [itemVariantSchema],
    // Dynamic list of KT values that currently have no uploaded photos
    pendingKts: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high performance
styleSchema.index({ styleCode: 1, item: 1 });
styleSchema.index({ categoryName: 1, styleCode: 1 });
styleSchema.index({ lastExcelImportId: 1 });
styleSchema.index({ pendingKts: 1 });

const Style = mongoose.model('Style', styleSchema);

export default Style;
