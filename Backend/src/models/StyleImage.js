import mongoose from 'mongoose';

const styleImageSchema = new mongoose.Schema(
  {
    originalFileName: {
      type: String,
      required: true,
      trim: true
    },
    folderPath: {
      type: String,
      default: '',
      trim: true
    },
    styleCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true
    },
    kt: {
      type: String,
      default: 'Unknown'
    },
    slot: {
      type: Number,
      min: 1,
      max: 4,
      default: 1
    },
    imageUrl: {
      type: String,
      default: ''
    },
    storageKey: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Matched', 'Unmatched'],
      default: 'Matched',
      index: true
    },
    errorReason: {
      type: String,
      default: ''
    },
    batchId: {
      type: String,
      index: true
    }
  },
  {
    timestamps: true
  }
);

styleImageSchema.index({ status: 1, createdAt: -1 });

const StyleImage = mongoose.model('StyleImage', styleImageSchema);

export default StyleImage;
