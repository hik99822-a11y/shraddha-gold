import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business/Customer name is required'],
      trim: true
    },
    businessName: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    username: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    // Multiple contact persons with Customer Name and Mobile Number
    contacts: [
      {
        name: {
          type: String,
          trim: true,
          default: ''
        },
        phone: {
          type: String,
          trim: true,
          default: ''
        }
      }
    ],
    // Multiple phone numbers stored as an array of strings (phones[0] is the primary number)
    phones: {
      type: [String],
      required: [true, 'At least one phone number is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0 && v.some((p) => p && String(p).trim().length > 0);
        },
        message: 'A customer must have at least one phone number'
      }
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true
    },
    // Granular Category Group, Category, and KT purity access with category-wise schedule
    categoryAccess: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category'
        },
        categoryName: {
          type: String,
          trim: true
        },
        group: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CategoryGroup'
        },
        groupName: {
          type: String,
          trim: true
        },
        kts: [
          {
            type: String
          }
        ],
        shareFormat: {
          type: String,
          enum: ['Link', 'PDF'],
          default: 'Link'
        },
        shareTime: {
          type: String,
          default: '10:00',
          trim: true
        },
        shareAfterDays: {
          type: Number,
          default: 0,
          min: 0
        },
        shareToken: {
          type: String,
          default: null,
          index: true
        },
        shareLinkCreatedAt: {
          type: Date,
          default: null
        },
        shareLinkExpiresAt: {
          type: Date,
          default: null
        },
        dispatchStatus: {
          type: String,
          enum: ['Pending', 'Sent', 'Failed', 'None'],
          default: 'None'
        },
        dispatchScheduledAt: {
          type: Date,
          default: null
        }
      }
    ],
    // Assigned Categories (kept in sync for backward compatibility)
    assignedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
    // Access Date & Time window
    accessStart: {
      type: Date,
      required: [true, 'Access start date/time is required'],
      default: Date.now
    },
    accessEnd: {
      type: Date,
      required: [true, 'Access end date/time is required']
    },
    // Link/PDF Share Settings (from FormData)
    shareFormat: {
      type: String,
      enum: ['Link', 'PDF'],
      default: 'Link'
    },
    linkShareType: {
      type: String,
      enum: ['Without Login', 'With Login'],
      default: 'Without Login'
    },
    linkShareTime: {
      type: String,
      default: '10:00',
      trim: true
    },
    linkShareAfterDays: {
      type: Number,
      default: 0,
      min: 0
    },
    // Customer Portal Tab Access Management
    panelTabAccess: {
      type: [{
        type: String,
        enum: ['ready', 'all']
      }],
      default: ['ready', 'all']
    },
    // User account credential settings (from FormData createLoginAccount/password)
    password: {
      type: String,
      select: true
    },
    plainPassword: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: 'customer'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: ''
    },
    // Embedded Share Link Token & Checkout OTP Management
    shareToken: {
      type: String,
      default: null,
      index: true
    },
    shareLinkCreatedAt: {
      type: Date,
      default: null
    },
    shareLinkExpiresAt: {
      type: Date,
      default: null
    },
    checkoutOtp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      targetPhone: { type: String, default: '' },
      verified: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual getter for primaryPhone (phones[0] is primary)
customerSchema.virtual('primaryPhone').get(function () {
  return (this.phones && this.phones[0]) ? this.phones[0] : '';
});

// Virtual setter for primaryPhone (updates phones[0])
customerSchema.virtual('primaryPhone').set(function (val) {
  if (val) {
    if (!this.phones) this.phones = [];
    if (this.phones.length > 0) {
      this.phones[0] = val;
    } else {
      this.phones.push(val);
    }
  }
});

// Pre-save hook to ensure consistency between name, businessName, contacts, phones, and categoryAccess
customerSchema.pre('save', function (next) {
  if (this.businessName && !this.name) {
    this.name = this.businessName;
  } else if (this.name && !this.businessName) {
    this.businessName = this.name;
  }

  // Ensure contacts array is kept in sync with phones
  if (Array.isArray(this.contacts) && this.contacts.length > 0) {
    const validPhones = this.contacts
      .map((c) => (c && c.phone ? String(c.phone).trim() : ''))
      .filter(Boolean);
    if (validPhones.length > 0) {
      this.phones = validPhones;
    }
  } else if (Array.isArray(this.phones) && this.phones.length > 0) {
    this.contacts = this.phones.map((p, idx) => ({
      name: idx === 0 ? (this.name || 'Primary Contact') : `Contact ${idx + 1}`,
      phone: p
    }));
  }

  // Ensure assignedCategories is kept in sync with categoryAccess
  if (Array.isArray(this.categoryAccess) && this.categoryAccess.length > 0) {
    const catIds = this.categoryAccess
      .map((ca) => (ca && ca.category ? ca.category : null))
      .filter(Boolean);
    if (catIds.length > 0) {
      this.assignedCategories = catIds;
    }
  }

  next();
});

// Index for fast search and validation
customerSchema.index({ businessName: 'text', name: 'text', city: 'text' });
customerSchema.index({ status: 1, accessStart: 1, accessEnd: 1 });
customerSchema.index({ phones: 1 });

// Encrypt password before saving and retain plainPassword
customerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Store plain text password before hashing
  this.plainPassword = this.password;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
customerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
