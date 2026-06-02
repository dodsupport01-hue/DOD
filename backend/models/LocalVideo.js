const mongoose = require('mongoose');

const localVideoSchema = new mongoose.Schema({
  title:              { type: String, required: true, trim: true },
  description:        { type: String, default: '' },
  badge:              { type: String, default: '' },
  videoUrl:           { type: String, required: true },   // Cloudinary secure_url
  cloudinaryPublicId: { type: String, required: true },   // for deletion
  thumbnailUrl:       { type: String, default: '' },      // optional poster frame
  order:              { type: Number, default: 0 },
  isActive:           { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('LocalVideo', localVideoSchema);
