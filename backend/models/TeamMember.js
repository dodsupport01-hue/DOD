const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true },
  designation:        { type: String, required: true, trim: true },
  section:            { type: String, enum: ['founders', 'leadership', 'advisory', 'board', ''], default: '' },
  email:              { type: String, default: '', trim: true, lowercase: true },
  description:        { type: String, default: '' },
  imageUrl:           { type: String, default: '' },
  cloudinaryPublicId: { type: String }, // legacy — kept during ImageKit migration
  imagekitFileId:     { type: String }, // ImageKit fileId, used for deletion
  order:              { type: Number, default: 0 },
  isActive:           { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
