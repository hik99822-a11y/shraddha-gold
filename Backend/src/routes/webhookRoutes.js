import express from 'express';
import { verifyWebhook, handleWebhookEvents } from '../controllers/webhookController.js';

const router = express.Router();

// GET endpoint to verify the webhook (used by Meta during setup)
router.get('/whatsapp', verifyWebhook);

// POST endpoint to receive incoming webhook events (messages, statuses)
router.post('/whatsapp', handleWebhookEvents);

export default router;
