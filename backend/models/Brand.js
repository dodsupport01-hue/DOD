const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
  },
  logoUrl: {
    type: String,
    required: [true, 'Brand logo URL is required'],
  },
  cloudinaryPublicId: {
    type: String, // Used to delete old image from Cloudinary when replaced
  },
  altText: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);
