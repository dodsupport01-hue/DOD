const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Reviews are published unattributed — the site shows no reviewer name, and
  // the admin panel no longer asks for one. Kept on the schema (optional) so
  // the names already stored on existing records are not lost.
  customerName:    { type: String, default: '', trim: true },
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
