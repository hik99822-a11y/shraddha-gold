import mongoose from 'mongoose';

const categoryGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category group name is required'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      default: ''
    },
    // References to Categories stored separately - never mutates Category master records
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      }
    ],
    // Snapshot of category names for resilience
    categoryNames: [
      {
        type: String,
        trim: true
      }
    ],
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

const CategoryGroup = mongoose.model('CategoryGroup', categoryGroupSchema);

export default CategoryGroup;
