import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/adminRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import sharedRoutes from './routes/sharedRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'] : '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads (style images, generated PDFs, Excel files)
app.use('/uploads/pdfs', (req, res, next) => {
  if (req.query.download === '1' || req.query.download === 'true') {
    const filename = path.basename(req.path);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
  next();
});
// Base paths configuration
const localServerDir = process.env.DESKTOP_SERVER_DIR && fs.existsSync(process.env.DESKTOP_SERVER_DIR)
  ? process.env.DESKTOP_SERVER_DIR
  : null;

const localUploadsDir = (process.env.DESKTOP_SERVER_DIR && fs.existsSync(process.env.DESKTOP_SERVER_DIR))
  ? process.env.DESKTOP_SERVER_DIR
  : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));

// Ensure local uploads directory exists
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

// 1. Static uploads (for PDFs, Excel exports, admin uploads stored on AWS)
app.use('/uploads', express.static(localUploadsDir));

// Fallback for /uploads if remote server is configured
app.use('/uploads', async (req, res, next) => {
  const remoteBase = process.env.DESKTOP_SERVER_URL ? process.env.DESKTOP_SERVER_URL.replace(/\/+$/, '') : null;
  if (!remoteBase) return next();
  try {
    const remoteUrl = `${remoteBase}/uploads${req.url}`;
    const response = await fetch(remoteUrl, {
      headers: { 'bypass-tunnel-reminder': 'true' }
    });
    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      const arrayBuffer = await response.arrayBuffer();
      return res.end(Buffer.from(arrayBuffer));
    }
  } catch (e) {}
  next();
});

// 2. On-the-fly Streaming Proxy for /server-images (Streams directly from Windows share \\SRV\... via Cloudflare Tunnel)
app.use('/server-images', async (req, res, next) => {
  const remoteBase = process.env.DESKTOP_SERVER_URL ? process.env.DESKTOP_SERVER_URL.replace(/\/+$/, '') : null;
  
  if (remoteBase) {
    try {
      // req.url preserves subpath and query (e.g. /RINGS/ALB00607.jpg)
      const remoteUrl = `${remoteBase}${req.url}`;
      const response = await fetch(remoteUrl, {
        headers: {
          'bypass-tunnel-reminder': 'true',
          'User-Agent': 'ShraddhaGold-Proxy/1.0'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: 'Image not found on Windows remote server',
          path: req.url,
          status: response.status
        });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours browser cache
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      return res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("\[Remote Image Proxy Error\]:", err, err.cause);
      return res.status(502).json({
        success: false,
        message: 'Windows Image Server unreachable via Cloudflare Tunnel. Please ensure serveImages.cjs and cloudflared are running on the Windows PC.',
        error: err.message
      });
    }
  }

  // If no remote URL is configured, fallback to local directory if exists
  if (localServerDir) {
    return express.static(localServerDir)(req, res, next);
  }

  return res.status(404).json({
    success: false,
    message: 'DESKTOP_SERVER_URL is not configured and local image directory does not exist'
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    brand: 'Shraddha Gold',
    role: 'Jewellery Manufacturer',
    timestamp: new Date().toISOString()
  });
});

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/shared', sharedRoutes);
app.use('/api/orders', orderRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
