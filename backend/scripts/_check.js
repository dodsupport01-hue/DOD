const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const dns = require('dns'); try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

(async () => {
  // 1) Account usage / status via Admin API (auth = api key/secret)
  try {
    const usage = await cloudinary.api.usage();
    console.log('=== Admin API OK ===');
    console.log('Plan:', usage.plan);
    console.log('Credits used:', JSON.stringify(usage.credits || usage.storage || {}));
    if (usage.media_limits) console.log('Media limits:', JSON.stringify(usage.media_limits));
  } catch (e) {
    console.error('Admin API FAILED:', e.message, e.error ? JSON.stringify(e.error) : '');
  }

  // 2) Try to fetch one resource's details + its delivery state
  try {
    const r = await cloudinary.api.resource('dod-healthcare/brands/g9z1akinfrwi8mwxps3l', { resource_type: 'image' });
    console.log('\n=== Resource details ===');
    console.log('bytes:', r.bytes, 'format:', r.format, 'secure_url:', r.secure_url);
    console.log('access_mode:', r.access_mode, 'access_control:', JSON.stringify(r.access_control || null));
  } catch (e) {
    console.error('Resource fetch FAILED:', e.message, e.error ? JSON.stringify(e.error) : '');
  }
})();
