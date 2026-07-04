const express = require('express');
const LocalVideo = require('../models/LocalVideo');
const { protect } = require('../middleware/auth');
const { uploadVideo, uploadToImageKit, deleteFromImageKit } = require('../config/imagekit');

const router = express.Router();

// GET /api/local-videos  (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const videos = await LocalVideo.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/local-videos/all  (ADMIN)
router.get('/all', protect, async (req, res) => {
  try {
    const videos = await LocalVideo.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/local-videos  (ADMIN) — uploads video file to ImageKit
router.post('/', protect, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }
    const { title, description, badge, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/local-videos');

    const video = await LocalVideo.create({
      title,
      description: description || '',
      badge: badge || '',
      videoUrl: url,
      imagekitFileId: fileId,
      order: order ? parseInt(order) : 0,
    });
    res.status(201).json({ success: true, message: 'Video uploaded successfully', data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/local-videos/:id  (ADMIN) — update metadata or replace video
router.put('/:id', protect, uploadVideo.single('video'), async (req, res) => {
  try {
    const video = await LocalVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    const { title, description, badge, order, isActive } = req.body;
    if (title)                video.title       = title;
    if (description !== undefined) video.description = description;
    if (badge !== undefined)  video.badge       = badge;
    if (order !== undefined)  video.order       = parseInt(order);
    if (isActive !== undefined) video.isActive  = isActive === 'true' || isActive === true;

    if (req.file) {
      await deleteFromImageKit(video.imagekitFileId);
      const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/local-videos');
      video.videoUrl       = url;
      video.imagekitFileId = fileId;
    }

    await video.save();
    res.json({ success: true, message: 'Video updated successfully', data: video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/local-videos/:id  (ADMIN)
router.delete('/:id', protect, async (req, res) => {
  try {
    const video = await LocalVideo.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    await deleteFromImageKit(video.imagekitFileId);
    await video.deleteOne();
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
