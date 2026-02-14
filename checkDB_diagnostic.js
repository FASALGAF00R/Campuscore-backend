import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDB() {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'campuscore' });
    console.log('Connected!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(
      'Collections present:',
      collections.map((c) => c.name)
    );

    // Check 'helprequests'
    const helpRequests = await db.collection('helprequests').find().toArray();
    console.log('--- Help Requests (helprequests collection) ---');
    console.log('Count:', helpRequests.length);
    if (helpRequests.length > 0) {
      console.log('Latest 2:', JSON.stringify(helpRequests.slice(-2), null, 2));
    }

    // Also check 'emergencyassists' just in case of confusion
    const emergencyAssists = await db.collection('emergencyassists').find().toArray();
    console.log('--- Emergency Assists (emergencyassists collection) ---');
    console.log('Count:', emergencyAssists.length);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDB();
