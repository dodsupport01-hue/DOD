const express = require('express');
const TeamMember = require('../models/TeamMember');
const { protect } = require('../middleware/auth');
const { uploadTeam, uploadToImageKit, deleteFromImageKit } = require('../config/imagekit');

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
    const { name, designation, section, email, description, order, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!designation) return res.status(400).json({ success: false, message: 'Designation is required' });
    if (!section) return res.status(400).json({ success: false, message: 'Section is required' });
    const validSections = ['founders', 'leadership', 'advisory', 'board'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Invalid section value' });
    }

    let imageUrl = '';
    let imagekitFileId = '';
    if (req.file) {
      const uploaded = await uploadToImageKit(req.file, 'dod-healthcare/team');
      imageUrl = uploaded.url;
      imagekitFileId = uploaded.fileId;
    }

    const member = await TeamMember.create({
      name,
      designation,
      section,
      email: email || '',
      description: description || '',
      imageUrl,
      imagekitFileId,
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

    const { name, designation, section, email, description, order, isActive } = req.body;
    if (section !== undefined && section !== '') {
      const validSections = ['founders', 'leadership', 'advisory', 'board'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ success: false, message: 'Invalid section value' });
      }
    }
    if (name) member.name = name;
    if (designation) member.designation = designation;
    if (section !== undefined) member.section = section;
    if (email !== undefined) member.email = email;
    if (description !== undefined) member.description = description;
    if (order !== undefined) member.order = parseInt(order);
    if (isActive !== undefined) member.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      await deleteFromImageKit(member.imagekitFileId);
      const { url, fileId } = await uploadToImageKit(req.file, 'dod-healthcare/team');
      member.imageUrl = url;
      member.imagekitFileId = fileId;
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

    await deleteFromImageKit(member.imagekitFileId);
    await member.deleteOne();
    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
