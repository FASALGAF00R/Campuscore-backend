import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Note: Email will be sent when needed. 
// If connection fails, OTP will be logged to console (development mode)

export default transporter;
