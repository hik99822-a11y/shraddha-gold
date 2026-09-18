import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getCustomerPortalContent,
  downloadCustomerPortalPdf
} from '../controllers/customerPortalController.js';

const router = express.Router();

// Enforce authentication & Customer (or Admin) role
router.use(protect);
router.use(authorizeRoles('customer', 'admin'));

router.get('/portal', getCustomerPortalContent);
router.post('/portal/pdf', downloadCustomerPortalPdf);

export default router;
