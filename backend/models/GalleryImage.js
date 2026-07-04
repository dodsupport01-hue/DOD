const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  caption: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String }, // legacy — kept during ImageKit migration
  imagekitFileId: { type: String },      // ImageKit fileId, used for deletion
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
