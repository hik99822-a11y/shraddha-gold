import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      default: ''
    },
    itemCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-validate hook to always populate normalizedName
categorySchema.pre('validate', function (next) {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
