const express = require('express');
const GalleryImage = require('../models/GalleryImage');
const { protect } = require('../middleware/auth');
const { uploadGallery, uploadToImageKit, deleteFromImageKit } = require('../config/imagekit');

const router = express.Router();

// GET /api/gallery  (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const images = await GalleryImage.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: images });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/gallery/all  (ADMIN)
router.get('/all', protect, async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: images });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/gallery  (ADMIN)
router.post('/', protect, uploadGallery.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    const { title, caption, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/gallery');

    const img = await GalleryImage.create({
      title,
      caption: caption || '',
      imageUrl: url,
      imagekitFileId: fileId,
      order: order ? parseInt(order) : 0,
    });
    res.status(201).json({ success: true, message: 'Image uploaded successfully', data: img });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/gallery/:id  (ADMIN)
router.put('/:id', protect, uploadGallery.single('image'), async (req, res) => {
  try {
    const img = await GalleryImage.findById(req.params.id);
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    const { title, caption, order, isActive } = req.body;
    if (title) img.title = title;
    if (caption !== undefined) img.caption = caption;
    if (order !== undefined) img.order = parseInt(order);
    if (isActive !== undefined) img.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      await deleteFromImageKit(img.imagekitFileId);
      const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/gallery');
      img.imageUrl = url;
      img.imagekitFileId = fileId;
    }

    await img.save();
    res.json({ success: true, message: 'Image updated successfully', data: img });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/gallery/:id  (ADMIN)
router.delete('/:id', protect, async (req, res) => {
  try {
    const img = await GalleryImage.findById(req.params.id);
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    await deleteFromImageKit(img.imagekitFileId);
    await img.deleteOne();
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
