const nodemailer = require('nodemailer');
const { Resend } = require('resend');

let resendClient = null;
const sentEmails = [];

function getResendClient() {
if (resendClient) return resendClient;
if (process.env.RESEND_API_KEY) {
resendClient = new Resend(process.env.RESEND_API_KEY);
}
return resendClient;
}

function buildEmailHtml(resetLink) {
return `
<div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
<h2 style="color: #2563eb;">TriFantasy Password Reset</h2>
<p>You requested a password reset for your TriFantasy account.</p>
<p>
<a href="${resetLink}"
style="display: inline-block; padding: 12px 24px; background: #2563eb;
color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
Reset Password
</a>
</p>
<p style="color: #6b7280; font-size: 14px;">This link expires in 4 hours.</p>
<p style="color: #9ca3af; font-size: 12px;">If you did not request this, ignore this email.</p>
</div>
`;
}

async function sendPasswordResetEmail(email, resetToken) {
const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
const html = buildEmailHtml(resetLink);

const emailRecord = {
to: email,
subject: 'TriFantasy — Password Reset',
resetLink,
sentAt: new Date().toISOString(),
};

// If Resend is configured, use it for production email delivery
const client = getResendClient();
if (client) {
await client.emails.send({
from: process.env.RESEND_FROM || 'TriFantasy <onboarding@resend.dev>',
to: email,
subject: 'TriFantasy — Password Reset',
html,
});
emailRecord.provider = 'resend';
emailRecord.status = 'sent';
sentEmails.push(emailRecord);
console.log(`[EMAIL] Sent password reset email to ${email} via Resend`);
return emailRecord;
}

// Local dev fallback: log and store (no external SMTP needed)
emailRecord.provider = 'local-dev';
emailRecord.status = 'sent';
sentEmails.push(emailRecord);
console.log(`\n========================================`);
console.log(`[EMAIL] Password reset email sent!`);
console.log(` To: ${email}`);
console.log(` Reset link: ${resetLink}`);
console.log(` Expires: 4 hours`);
console.log(`========================================\n`);
return emailRecord;
}

function getSentEmails() {
return sentEmails;
}

module.exports = { sendPasswordResetEmail, getSentEmails };