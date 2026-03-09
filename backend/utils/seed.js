const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existing) {
      await Admin.create({
        email: process.env.ADMIN_EMAIL || 'admin@dodhealthcare.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        name: 'DOD Admin',
        role: 'admin',
      });
      console.log(`✅ Default admin created: ${process.env.ADMIN_EMAIL}`);
      console.log('⚠️  Change the admin password after first login!');
    } else {
      console.log('ℹ️  Admin already exists, skipping seed.');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = { seedAdmin };
