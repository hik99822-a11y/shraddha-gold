import express from 'express';
import { getLandingPageSettings, updateLandingPageSettings } from '../controllers/landingPageController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { landingPageImageUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/upload-image', protect, authorizeRoles('admin'), landingPageImageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided' });
  }
  const imageUrl = `/uploads/landing-page/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

router.route('/')
  .get(getLandingPageSettings)
  .put(protect, authorizeRoles('admin'), updateLandingPageSettings);

export default router;
