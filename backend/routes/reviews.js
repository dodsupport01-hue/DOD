const express = require('express');
const Review = require('../models/Review');
const { protect } = require('../middleware/auth');
const { uploadReview, uploadToImageKit, deleteFromImageKit } = require('../config/imagekit');

const router = express.Router();

// A review carries a video and, optionally, a poster image for the tile.
const uploadFields = uploadReview.fields([
  { name: 'video', maxCount: 1 },
  { name: 'poster', maxCount: 1 },
]);

// GET /api/reviews  (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews/all  (ADMIN)
router.get('/all', protect, async (req, res) => {
  try {
    const reviews = await Review.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/reviews  (ADMIN) — uploads the review video (+ optional poster)
router.post('/', protect, uploadFields, async (req, res) => {
  try {
    const videoFile = req.files && req.files.video && req.files.video[0];
    const posterFile = req.files && req.files.poster && req.files.poster[0];

    if (!videoFile) {
      return res.status(400).json({ success: false, message: 'Video file is required' });
    }
    const { customerName, location, rating, quote, order } = req.body;
    if (!customerName) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const video = await uploadToImageKit(videoFile, 'dod-healthcare/reviews');
    const poster = posterFile
      ? await uploadToImageKit(posterFile, 'dod-healthcare/reviews/posters')
      : null;

    const review = await Review.create({
      customerName,
      location: location || '',
      rating: rating ? parseInt(rating) : 5,
      quote: quote || '',
      videoUrl: video.url,
      imagekitFileId: video.fileId,
      thumbnailUrl: poster ? poster.url : '',
      thumbnailFileId: poster ? poster.fileId : '',
      order: order ? parseInt(order) : 0,
    });
    res.status(201).json({ success: true, message: 'Review uploaded successfully', data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/reviews/:id  (ADMIN) — update details, replace video and/or poster
router.put('/:id', protect, uploadFields, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const { customerName, location, rating, quote, order, isActive } = req.body;
    if (customerName)          review.customerName = customerName;
    if (location !== undefined) review.location    = location;
    if (rating !== undefined)  review.rating       = parseInt(rating);
    if (quote !== undefined)   review.quote        = quote;
    if (order !== undefined)   review.order        = parseInt(order);
    if (isActive !== undefined) review.isActive    = isActive === 'true' || isActive === true;

    const videoFile = req.files && req.files.video && req.files.video[0];
    const posterFile = req.files && req.files.poster && req.files.poster[0];

    if (videoFile) {
      await deleteFromImageKit(review.imagekitFileId);
      const video = await uploadToImageKit(videoFile, 'dod-healthcare/reviews');
      review.videoUrl = video.url;
      review.imagekitFileId = video.fileId;
    }
    if (posterFile) {
      await deleteFromImageKit(review.thumbnailFileId);
      const poster = await uploadToImageKit(posterFile, 'dod-healthcare/reviews/posters');
      review.thumbnailUrl = poster.url;
      review.thumbnailFileId = poster.fileId;
    }

    await review.save();
    res.json({ success: true, message: 'Review updated successfully', data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/reviews/:id  (ADMIN)
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    await deleteFromImageKit(review.imagekitFileId);
    await deleteFromImageKit(review.thumbnailFileId);
    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
