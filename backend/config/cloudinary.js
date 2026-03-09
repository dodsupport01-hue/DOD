const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for brand logos
const brandStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dod-healthcare/brands',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
    transformation: [{ width: 400, height: 200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  },
});

// Storage for certification logos
const certStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dod-healthcare/certifications',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  },
});

const uploadBrand = multer({
  storage: brandStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCert = multer({
  storage: certStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = { cloudinary, uploadBrand, uploadCert, deleteFromCloudinary };
