const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customerName:    { type: String, required: [true, 'Customer name is required'], trim: true },
  location:        { type: String, default: '' },          // e.g. "Lucknow, UP"
  rating:          { type: Number, default: 5, min: 1, max: 5 },
  quote:           { type: String, default: '' },          // short written testimonial
  videoUrl:        { type: String, required: true },       // uploaded review video (ImageKit)
  imagekitFileId:  { type: String },                       // used to delete the video
  thumbnailUrl:    { type: String, default: '' },          // optional poster frame
  thumbnailFileId: { type: String },                       // used to delete the poster
  order:           { type: Number, default: 0 },
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
