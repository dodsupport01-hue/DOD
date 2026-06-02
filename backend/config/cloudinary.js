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

// Storage for gallery images
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dod-healthcare/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  },
});

const uploadGallery = multer({
  storage: galleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Storage for team member photos
const teamStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dod-healthcare/team',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
  },
});

const uploadTeam = multer({
  storage: teamStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Storage for local showcase videos
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dod-healthcare/local-videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'webm', 'avi'],
    // No eager transformations — stream originals for best quality
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = { cloudinary, uploadBrand, uploadCert, uploadGallery, uploadTeam, uploadVideo, deleteFromCloudinary };
