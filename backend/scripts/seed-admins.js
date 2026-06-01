/**
* Seed admin accounts.
*
* Usage:
* MONGO_PASSWORD=<pw> node scripts/seed-admins.js
*
* Set ADMIN_EMAILS to a comma-separated list of emails to promote.
* If the user doesn't exist yet, you can register them first via the
* normal signup flow, then run this script.
*/
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');

const DEFAULT_ADMIN_EMAILS = [
'sury@example.com',
];

async function seedAdmins() {
await connectDB();

const adminEmails = process.env.ADMIN_EMAILS
? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
: DEFAULT_ADMIN_EMAILS;

console.log(`Promoting ${adminEmails.length} user(s) to admin...`);

for (const email of adminEmails) {
const user = await User.findOne({ email });
if (!user) {
console.log(` ✗ ${email} — user not found (register first)`);
continue;
}
if (user.role === 'admin') {
console.log(` ✓ ${email} — already admin`);
continue;
}
user.role = 'admin';
await user.save();
console.log(` ✓ ${email} — promoted to admin`);
}

await mongoose.disconnect();
console.log('Done.');
}

seedAdmins().catch(err => {
console.error('Seed error:', err);
process.exit(1);
});