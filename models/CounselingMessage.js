import mongoose from 'mongoose';

const counselingMessageSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CounselingRequest',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['student', 'counselor'],
      required: true,
    },
    plainContent: {
      type: String,
      required: function () {
        return !this.isEncrypted;
      },
    },
    encryptedContent: {
      type: String,
      required: function () {
        return this.isEncrypted;
      },
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient message retrieval
counselingMessageSchema.index({ requestId: 1, createdAt: -1 });

// Pre-save hook to ensure either plain or encrypted content exists
counselingMessageSchema.pre('save', function (next) {
  if (!this.plainContent && !this.encryptedContent) {
    next(new Error('Message must have either plainContent or encryptedContent'));
  }
  next();
});

const CounselingMessage = mongoose.model('CounselingMessage', counselingMessageSchema);

export default CounselingMessage;
