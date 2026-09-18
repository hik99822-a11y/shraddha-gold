import express from 'express';
import { createInquiry, getInquiries } from '../controllers/inquiryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createInquiry);
router.get('/', protect, getInquiries);

export default router;
