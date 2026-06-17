const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/messages  (PUBLIC - website contact form submits here) ───────
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, interest, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (!emailOk) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    await Message.create({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : '',
      company: company ? String(company).trim() : '',
      interest: interest ? String(interest).trim() : '',
      message: String(message).trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Your request is submitted. Our team will contact you soon.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/messages  (ADMIN - list all, newest first) ───────────────────
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    const unread = messages.filter(m => !m.isRead).length;
    res.json({ success: true, count: messages.length, unread, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/messages/:id/read  (ADMIN - toggle read status) ─────────────
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    msg.isRead = req.body.isRead !== undefined ? !!req.body.isRead : !msg.isRead;
    await msg.save();

    res.json({ success: true, message: 'Message updated', data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/messages/:id  (ADMIN) ──────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    await msg.deleteOne();
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
