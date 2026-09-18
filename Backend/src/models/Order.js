import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Style'
    },
    styleCode: {
      type: String,
      required: true,
      trim: true
    },
    item: {
      type: String,
      default: '',
      trim: true
    },
    displayCode: {
      type: String,
      default: '',
      trim: true
    },
    categoryName: {
      type: String,
      default: ''
    },
    kt: {
      type: String,
      default: ''
    },
    purity: {
      type: String,
      default: '22KT'
    },
    grossWeight: {
      type: Number,
      default: 0
    },
    netWeight: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    imageUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    isMakeStock: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    orderedBy: {
      type: String,
      default: '',
      trim: true
    },
    customerPhone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true,
      index: true
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    orderSource: {
      type: String,
      enum: ['With Login', 'Without Login', 'Customer Portal'],
      default: 'Without Login'
    },
    shareToken: {
      type: String,
      default: ''
    },
    orderType: {
      type: String,
      enum: ['Regular', 'Make Stock'],
      default: 'Regular'
    },
    items: [orderItemSchema],
    totalItems: {
      type: Number,
      default: 0
    },
    totalQuantity: {
      type: Number,
      default: 0
    },
    totalGrossWeight: {
      type: Number,
      default: 0
    },
    totalNetWeight: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'In Production', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    pdfUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    remark: {
      type: String,
      default: ''
    },
    whatsappDispatches: {
      customer: {
        targetPhone: { type: String, default: '' },
        status: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Simulated'], default: 'Pending' },
        sentAt: { type: Date, default: null },
        messageId: { type: String, default: '' },
        errorMessage: { type: String, default: '' }
      },
      admin: {
        targetPhone: { type: String, default: '' },
        status: { type: String, enum: ['Pending', 'Sent', 'Failed', 'Simulated'], default: 'Pending' },
        sentAt: { type: Date, default: null },
        messageId: { type: String, default: '' },
        errorMessage: { type: String, default: '' }
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup and dashboard metrics
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerPhone: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
