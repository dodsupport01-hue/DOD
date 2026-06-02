const express = require('express');
const TeamMember = require('../models/TeamMember');
const { protect } = require('../middleware/auth');
const { uploadTeam, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// GET /api/team  (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const members = await TeamMember.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/team/all  (ADMIN)
router.get('/all', protect, async (req, res) => {
  try {
    const members = await TeamMember.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/team  (ADMIN)
router.post('/', protect, uploadTeam.single('image'), async (req, res) => {
  try {
    const { name, designation, mobile, email, description, order, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!designation) return res.status(400).json({ success: false, message: 'Designation is required' });
    if (mobile && !/^\d{10}$/.test(mobile.replace(/\s/g, ''))) {
      return res.status(400).json({ success: false, message: 'Mobile must be exactly 10 digits' });
    }

    const member = await TeamMember.create({
      name,
      designation,
      mobile: mobile || '',
      email: email || '',
      description: description || '',
      imageUrl: req.file ? req.file.path : '',
      cloudinaryPublicId: req.file ? req.file.filename : '',
      order: order ? parseInt(order) : 0,
      isActive: isActive !== 'false',
    });
    res.status(201).json({ success: true, message: 'Team member added successfully', data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/team/:id  (ADMIN)
router.put('/:id', protect, uploadTeam.single('image'), async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Team member not found' });

    const { name, designation, mobile, email, description, order, isActive } = req.body;
    if (mobile !== undefined && mobile !== '' && !/^\d{10}$/.test(mobile.replace(/\s/g, ''))) {
      return res.status(400).json({ success: false, message: 'Mobile must be exactly 10 digits' });
    }
    if (name) member.name = name;
    if (designation) member.designation = designation;
    if (mobile !== undefined) member.mobile = mobile;
    if (email !== undefined) member.email = email;
    if (description !== undefined) member.description = description;
    if (order !== undefined) member.order = parseInt(order);
    if (isActive !== undefined) member.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      await deleteFromCloudinary(member.cloudinaryPublicId);
      member.imageUrl = req.file.path;
      member.cloudinaryPublicId = req.file.filename;
    }

    await member.save();
    res.json({ success: true, message: 'Team member updated successfully', data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/team/:id  (ADMIN)
router.delete('/:id', protect, async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Team member not found' });

    await deleteFromCloudinary(member.cloudinaryPublicId);
    await member.deleteOne();
    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
