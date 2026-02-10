import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['student', 'faculty', 'staff', 'counselor', 'admin', 'super-admin']
  },
  permissions: [{
    type: String,
    // Format: 'module.action' e.g., 'sos.read', 'events.create'
  }],
  isSystemRole: {
    type: Boolean,
    default: false // Protect system roles from deletion
  },
  description: String
}, {
  timestamps: true
});

export default mongoose.model('Role', roleSchema);
