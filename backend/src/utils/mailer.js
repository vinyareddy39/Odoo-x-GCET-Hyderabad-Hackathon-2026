import nodemailer from 'nodemailer';

let transporter = null;

const createTransporter = () => {
  if (transporter) return transporter;

  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  } catch (err) {
    console.warn('[Mailer] Could not initialize nodemailer transporter:', err.message);
  }
  return transporter;
};

export const sendOtpEmail = async (email, otp) => {
  console.log(`\n======================================================`);
  console.log(`🔐 [StockSense OTP Delivery]`);
  console.log(`To: ${email}`);
  console.log(`Generated OTP: ${otp}`);
  console.log(`Expires in: 10 minutes`);
  console.log(`======================================================\n`);

  try {
    const mailClient = createTransporter();
    if (!mailClient || !process.env.SMTP_USER || process.env.SMTP_USER === 'demo@stocksense.local') {
      // Ethereal / Local demo mode: logged to console and returned
      return { success: true, mode: 'local_preview', otp };
    }

    const info = await mailClient.sendMail({
      from: process.env.SMTP_FROM || 'StockSense Security <security@stocksense.com>',
      to: email,
      subject: 'Your StockSense Password Reset OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">StockSense Inventory</h2>
          <p style="color: #475569; font-size: 14px;">You requested a password reset for your StockSense account.</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId, otp };
  } catch (err) {
    console.warn('[Mailer Warning] Email dispatch failed, relying on console OTP:', err.message);
    return { success: true, mode: 'console_fallback', otp };
  }
};
