import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Manufacturing Inquiry'
    },
    category: {
      type: String,
      default: 'Custom Manufacturing'
    },
    estimatedVolume: {
      type: String,
      default: 'Not specified'
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['New', 'In Review', 'Contacted', 'Closed'],
      default: 'New'
    }
  },
  {
    timestamps: true
  }
);

const Inquiry = mongoose.model('Inquiry', inquirySchema);

export default Inquiry;
