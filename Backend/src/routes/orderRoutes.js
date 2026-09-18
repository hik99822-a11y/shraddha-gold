import express from 'express';
import {
  sendCheckoutOtp,
  verifyOtpAndPlaceOrder,
  lookupCustomerPhones,
  createAuthenticatedOrder,
  getAdminOrders,
  getOrderById,
  getOrderPdf,
  updateOrderStatus,
  deleteOrder,
  resendOrderWhatsApp,
  checkOrderStock,
  getPendingOrderCounts
} from '../controllers/orderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Stock check endpoint (accessible for Customer Portal & Shared Viewer carts)
router.post('/check-stock', checkOrderStock);

// 2. Public OTP checkout endpoints (Without Login)
router.post('/customer-phones', lookupCustomerPhones);
router.post('/send-otp', sendCheckoutOtp);
router.post('/verify-otp-and-order', verifyOtpAndPlaceOrder);

// 2. Authenticated order creation (With Login / Customer Portal)
router.post('/create', protect, createAuthenticatedOrder);

// 3. Admin orders management
router.get('/pending-counts', protect, authorizeRoles('admin'), getPendingOrderCounts);
router.get('/admin', protect, authorizeRoles('admin'), getAdminOrders);
router.patch('/:id/status', protect, authorizeRoles('admin'), updateOrderStatus);
router.delete('/:id', protect, authorizeRoles('admin'), deleteOrder);
router.post('/:id/resend-whatsapp', protect, authorizeRoles('admin'), resendOrderWhatsApp);

// 4. View single order and PDF
router.get('/:id/pdf', getOrderPdf);
router.get('/:id', getOrderById);

export default router;
