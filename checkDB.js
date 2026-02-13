import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'campuscore',
    });

    const students = await User.find({ role: 'student' });
    console.log('Students in DB:');
    students.forEach((s) => {
      console.log(`- ${s.firstName} ${s.lastName}, Dept: "${s.department}", ID: ${s.studentId}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
