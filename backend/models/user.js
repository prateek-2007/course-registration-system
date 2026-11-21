const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    studentId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      validate: {
        validator: function (value) {
          if (this.role === 'student') {
            return Boolean(value && value.trim().length > 0);
          }
          return true;
        },
        message: 'Student ID is required for student accounts',
      },
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'student'],
        message: 'Role must be either admin or student',
      },
      default: 'student',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentId: { $type: 'string' },
    },
  }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
