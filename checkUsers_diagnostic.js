import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'campuscore' });
    const db = mongoose.connection.db;

    const admins = await db.collection('users').find({ role: 'admin' }).toArray();
    console.log(
      'Admins:',
      JSON.stringify(
        admins.map((a) => ({ email: a.email, role: a.role, isActive: a.isActive })),
        null,
        2
      )
    );

    const staff = await db.collection('users').find({ role: 'staff' }).toArray();
    console.log(
      'Staff:',
      JSON.stringify(
        staff.map((s) => ({ email: s.email, role: s.role, isActive: s.isActive })),
        null,
        2
      )
    );

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsers();
