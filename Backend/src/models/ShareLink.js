import mongoose from 'mongoose';

const shareLinkSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: 'Category Catalog'
    },
    // Category scope
    categoryNames: {
      type: [String],
      default: []
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
    // Category Group scope
    categoryGroupNames: {
      type: [String],
      default: []
    },
    categoryGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryGroup'
      }
    ],
    // Karat/KT purity restrictions (e.g. ['18KT', '20KT', '22KT'] or empty for all)
    kts: {
      type: [String],
      default: []
    },
    scope: {
      type: String,
      enum: ['Category', 'AllCategories'],
      default: 'Category'
    },
    // Distinguish system auto-generated default link for All Categories from manual custom links
    isDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    // Access control: 'Without Login' (default instant access) or 'With Login'
    accessType: {
      type: String,
      enum: ['Without Login', 'With Login'],
      default: 'Without Login'
    },
    accessStart: {
      type: Date,
      default: Date.now
    },
    accessEnd: {
      type: Date,
      default: null // null indicates permanent / no expiry
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Revoked'],
      default: 'Active',
      index: true
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const ShareLink = mongoose.model('ShareLink', shareLinkSchema);

export default ShareLink;
