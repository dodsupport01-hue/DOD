const express = require('express');
const Certification = require('../models/Certification');
const { protect } = require('../middleware/auth');
const { uploadCert, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// ─── GET /api/certifications  (PUBLIC - frontend uses this) ────────────────
router.get('/', async (req, res) => {
  try {
    const certs = await Certification.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/certifications/all  (ADMIN - includes inactive) ──────────────
router.get('/all', protect, async (req, res) => {
  try {
    const certs = await Certification.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/certifications  (ADMIN - create) ────────────────────────────
router.post('/', protect, uploadCert.single('logo'), async (req, res) => {
  try {
    const { title, description, year, sealEmoji, order } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const certData = {
      title,
      description,
      year: year || '',
      sealEmoji: sealEmoji || '🏆',
      order: order ? parseInt(order) : 0,
    };

    if (req.file) {
      certData.logoUrl = req.file.path;
      certData.cloudinaryPublicId = req.file.filename;
    }

    const cert = await Certification.create(certData);
    res.status(201).json({ success: true, message: 'Certification created successfully', data: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/certifications/:id  (ADMIN - update) ─────────────────────────
router.put('/:id', protect, uploadCert.single('logo'), async (req, res) => {
  try {
    const cert = await Certification.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certification not found' });

    const { title, description, year, sealEmoji, order, isActive } = req.body;

    if (title) cert.title = title;
    if (description) cert.description = description;
    if (year !== undefined) cert.year = year;
    if (sealEmoji) cert.sealEmoji = sealEmoji;
    if (order !== undefined) cert.order = parseInt(order);
    if (isActive !== undefined) cert.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      await deleteFromCloudinary(cert.cloudinaryPublicId);
      cert.logoUrl = req.file.path;
      cert.cloudinaryPublicId = req.file.filename;
    }

    await cert.save();
    res.json({ success: true, message: 'Certification updated successfully', data: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/certifications/:id  (ADMIN) ───────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const cert = await Certification.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certification not found' });

    await deleteFromCloudinary(cert.cloudinaryPublicId);
    await cert.deleteOne();

    res.json({ success: true, message: 'Certification deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
