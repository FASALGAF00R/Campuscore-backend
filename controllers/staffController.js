import User from '../models/User.js';

// Get public list of staff members
export const getPublicStaff = async (req, res) => {
  try {
    const staff = await User.find({
      role: 'staff',
      isActive: true, // Only active
      isVerified: true,
      isApproved: true,
    })
      .select('firstName lastName email category bio availability phone')
      .sort({ firstName: 1 });

    res.status(200).json({ success: true, data: { staff } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
