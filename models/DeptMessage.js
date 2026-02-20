import mongoose from 'mongoose';

const deptMessageSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text'],
      default: 'text',
    },
  },
  { timestamps: true }
);

// Index for fast retrieval by department + time
deptMessageSchema.index({ department: 1, createdAt: -1 });

const DeptMessage = mongoose.model('DeptMessage', deptMessageSchema);

export default DeptMessage;
