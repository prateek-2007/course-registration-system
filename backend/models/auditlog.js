const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required for audit logs'],
      immutable: true,
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      enum: {
        values: [
          'COURSE_REGISTERED',
          'COURSE_DROPPED',
          'COURSE_CREATED',
          'COURSE_UPDATED',
          'COURSE_DELETED',
          'STUDENT_CREATED',
          'STUDENT_UPDATED',
          'STUDENT_DELETED',
          'PASSWORD_CHANGED',
        ],
        message: 'Invalid audit log action type',
      },
      immutable: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      immutable: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      immutable: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    details: {
      type: String,
      required: [true, 'Audit details description is required'],
      trim: true,
      immutable: true,
    },
  },
  {
    timestamps: false,
  }
);

const blockModification = async function () {
  throw new Error('AuditLog records are append-only and cannot be modified or deleted.');
};

auditLogSchema.pre('updateOne', blockModification);
auditLogSchema.pre('findOneAndUpdate', blockModification);
auditLogSchema.pre('updateMany', blockModification);
auditLogSchema.pre('deleteOne', blockModification);
auditLogSchema.pre('findOneAndDelete', blockModification);
auditLogSchema.pre('deleteMany', blockModification);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ courseId: 1, timestamp: -1 });
auditLogSchema.index({ studentId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
