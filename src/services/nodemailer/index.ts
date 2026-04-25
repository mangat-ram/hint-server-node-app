import nodemailer, { Transporter } from "nodemailer";
import { mailPassword, mailUsername } from "../../config";

/* =========================
   Types
========================= */

interface FeedbackData {
  query: string;
  name: string;
  email: string;
  text: string;
}

/* =========================
   Transporter
========================= */

const transporter: Transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: mailUsername as string,
    pass: mailPassword as string
  }
});

/* =========================
   Send OTP Mail
========================= */

export const sendMail = async (
  recipientEmail: string,
  subject: string,
  otp: string
): Promise<void> => {
  try {
    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:20px;border:1px solid #90e0ef;border-radius:8px;font-family:Arial">
        <h2 style="text-align:center;">Your Verification Code</h2>
        <p>Hi there, Greetings from HINT Bharat</p>
        <p>Use the OTP below to verify your account:</p>
        <div style="font-size:1.5rem;font-weight:bold;background:#219ebc;color:#fff;padding:10px 20px;border-radius:4px;width:max-content;margin:20px auto;">
          ${otp}
        </div>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: recipientEmail,
      subject,
      html: htmlTemplate
    });

    console.log("Email sent:", result.messageId);
  } catch (error) {
    console.error("Error sending OTP mail:", error);
    throw error;
  }
};

/* =========================
   Send Feedback Mail
========================= */

export const sendFeedbackMail = async (
  recipientEmail: string,
  subject: string,
  feedbackData: FeedbackData
): Promise<void> => {
  try {
    const { query, name, email, text } = feedbackData;

    const htmlTemplate = `
      <div style="max-width:600px;margin:auto;padding:20px;border:1px solid #90e0ef;border-radius:8px;font-family:Arial">
        <h2 style="text-align:center;">New Feedback Received</h2>

        <p><strong>Username:</strong> ${name}</p>
        <p><strong>User Email:</strong> ${email}</p>
        <p><strong>Query Type:</strong> ${query}</p>

        <p><strong>Message:</strong></p>
        <div style="background:#f1f8ff;padding:10px;border-radius:6px;">
          ${text}
        </div>

        <p style="margin-top:20px;">Follow up directly if needed.</p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: recipientEmail,
      subject,
      html: htmlTemplate
    });

    console.log("Feedback email sent:", result.messageId);
  } catch (error) {
    console.error("Error sending feedback mail:", error);
    throw error;
  }
};