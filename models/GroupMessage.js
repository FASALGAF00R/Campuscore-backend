import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupChat',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    isReadBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    messageType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for group-based retrieval
groupMessageSchema.index({ group: 1, createdAt: -1 });

export default mongoose.model('GroupMessage', groupMessageSchema);
