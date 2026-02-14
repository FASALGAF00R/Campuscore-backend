import mongoose from 'mongoose';

const helpRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      default: 'Student Support',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Subject/Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
      required: true,
    },
    preferredDate: {
      type: Date,
    },
    attachments: [
      {
        type: String, // URL/Path to file
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    consent: {
      type: Boolean,
      required: [true, 'Consent is required'],
      validate: {
        validator: (v) => v === true,
        message: 'You must confirm that the information is correct',
      },
    },
    staffMessage: {
      type: String,
      trim: true,
    },
    staffContact: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);

export default HelpRequest;
