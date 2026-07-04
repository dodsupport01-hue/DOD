const express = require('express');
const Brand = require('../models/Brand');
const { protect } = require('../middleware/auth');
const { uploadBrand, uploadToImageKit, deleteFromImageKit } = require('../config/imagekit');

const router = express.Router();

// ─── GET /api/brands  (PUBLIC - frontend uses this) ────────────────────────
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: brands });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/brands/all  (ADMIN - includes inactive) ──────────────────────
router.get('/all', protect, async (req, res) => {
  try {
    const brands = await Brand.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: brands });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/brands  (ADMIN - create with image upload) ──────────────────
router.post('/', protect, uploadBrand.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Brand logo image is required' });
    }

    const { name, altText, order } = req.body;

    const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/brands');

    const brand = await Brand.create({
      name,
      altText: altText || name,
      logoUrl: url,
      imagekitFileId: fileId,
      order: order ? parseInt(order) : 0,
    });

    res.status(201).json({ success: true, message: 'Brand created successfully', data: brand });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/brands/:id  (ADMIN - update brand) ───────────────────────────
router.put('/:id', protect, uploadBrand.single('logo'), async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    const { name, altText, order, isActive } = req.body;

    if (name) brand.name = name;
    if (altText) brand.altText = altText;
    if (order !== undefined) brand.order = parseInt(order);
    if (isActive !== undefined) brand.isActive = isActive === 'true' || isActive === true;

    // If new image uploaded, delete old one from ImageKit
    if (req.file) {
      await deleteFromImageKit(brand.imagekitFileId);
      const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/brands');
      brand.logoUrl = url;
      brand.imagekitFileId = fileId;
    }

    await brand.save();
    res.json({ success: true, message: 'Brand updated successfully', data: brand });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/brands/:id  (ADMIN) ───────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' });

    await deleteFromImageKit(brand.imagekitFileId);
    await brand.deleteOne();

    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
