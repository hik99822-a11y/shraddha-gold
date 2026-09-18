import express from 'express';
import { getSharedContent } from '../controllers/shareLinkController.js';

const router = express.Router();

// Public route for shared token portfolio viewer
router.get('/:token', getSharedContent);

export default router;
