import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const normalizeDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'campuscore',
    });
    console.log('Connected to DB:', mongoose.connection.name);

    // Normalize "Computerscience" to "Computer Science"
    const result = await User.updateMany(
      { department: { $regex: /Computerscience/i } },
      { $set: { department: 'Computer Science' } }
    );

    console.log(`Updated ${result.modifiedCount} users to "Computer Science"`);

    // You can add more normalizations here if needed

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

normalizeDB();
