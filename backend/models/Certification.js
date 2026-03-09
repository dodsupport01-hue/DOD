const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Certification title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  year: {
    type: String,
    default: '',
  },
  // Either an uploaded image OR an emoji seal
  logoUrl: {
    type: String,
    default: '',
  },
  cloudinaryPublicId: {
    type: String,
  },
  sealEmoji: {
    type: String,
    default: '🏆',
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

module.exports = mongoose.model('Certification', certificationSchema);
