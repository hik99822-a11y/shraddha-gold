import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please provide email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    username: {
      type: String,
      required: [true, 'Please provide username'],
      unique: true,
      lowercase: true,
      trim: true
    },
    mobile: {
      type: [String],
      required: [true, 'Please provide at least one mobile number'],
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0 && v.some(p => p && String(p).trim().length > 0);
        },
        message: 'A user must have at least one valid mobile number'
      }
    },
    companyName: {
      type: String,
      default: 'Jewellery Partner'
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: 6,
      select: true
    },
    plainPassword: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['client', 'retailer', 'wholesaler', 'partner', 'admin', 'customer'],
      default: 'customer'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Encrypt password before saving and retain plainPassword
userSchema.pre('save', async function (next) {
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
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
