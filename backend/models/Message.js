const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 120,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    maxlength: 160,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
    maxlength: 40,
  },
  company: {
    type: String,
    trim: true,
    default: '',
    maxlength: 160,
  },
  interest: {
    type: String,
    trim: true,
    default: '',
    maxlength: 80,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: 5000,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
