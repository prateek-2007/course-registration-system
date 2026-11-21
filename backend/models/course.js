const mongoose = require('mongoose');

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const trimmed = timeStr.trim().toUpperCase();

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3];
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return NaN;
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }

  const twentyFourMatch = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourMatch) {
    const hours = parseInt(twentyFourMatch[1], 10);
    const minutes = parseInt(twentyFourMatch[2], 10);
    return hours * 60 + minutes;
  }

  return NaN;
};

const courseSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [150, 'Course name cannot exceed 150 characters'],
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Course code cannot exceed 20 characters'],
    },
    facultyName: {
      type: String,
      required: [true, 'Faculty / Instructor name is required'],
      trim: true,
      default: 'TBA',
      maxlength: [100, 'Faculty name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    credits: {
      type: Number,
      required: [true, 'Course credits are required'],
      min: [1, 'Credits must be at least 1'],
      max: [10, 'Credits cannot exceed 10'],
    },
    date: {
      type: Date,
      required: [true, 'Course date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (e.g., 10:00 or 10:00 AM)'],
      trim: true,
      validate: {
        validator: function (val) {
          return !Number.isNaN(parseTimeToMinutes(val));
        },
        message: 'Start time must be a valid time in HH:mm (24h) or hh:mm AM/PM format',
      },
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (e.g., 12:00 or 12:00 PM)'],
      trim: true,
      validate: {
        validator: function (val) {
          return !Number.isNaN(parseTimeToMinutes(val));
        },
        message: 'End time must be a valid time in HH:mm (24h) or hh:mm AM/PM format',
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Maximum seat capacity is required'],
      min: [1, 'Capacity must be greater than zero'],
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: [0, 'Enrolled count cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be either active or inactive',
      },
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Course creator (admin) reference is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.capacity - this.enrolledCount);
});

courseSchema.pre('validate', function () {
  const startMinutes = parseTimeToMinutes(this.startTime);
  const endMinutes = parseTimeToMinutes(this.endTime);

  if (!Number.isNaN(startMinutes) && !Number.isNaN(endMinutes)) {
    if (startMinutes >= endMinutes) {
      this.invalidate(
        'endTime',
        'Start time must be strictly earlier than end time'
      );
    }
  }

  if (
    typeof this.enrolledCount === 'number' &&
    typeof this.capacity === 'number' &&
    this.enrolledCount > this.capacity
  ) {
    this.invalidate(
      'enrolledCount',
      'Enrolled count cannot exceed maximum course capacity'
    );
  }
});

courseSchema.index({ status: 1, date: 1 });
courseSchema.index({ createdBy: 1 });

const Course = mongoose.model('Course', courseSchema);
Course.parseTimeToMinutes = parseTimeToMinutes;

module.exports = Course;
