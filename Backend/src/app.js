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
const desktopServerDir = process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';
const desktopServerUrl = process.env.DESKTOP_SERVER_URL;
const uploadsDir = process.env.DESKTOP_SERVER_DIR || '/Users/hardik/Desktop/server';

if (desktopServerUrl) {
  app.use('/uploads', (req, res) => {
    res.redirect(`${desktopServerUrl}${req.path}`);
  });
  app.use('/server-images', (req, res) => {
    res.redirect(`${desktopServerUrl}${req.path}`);
  });
} else {
  app.use('/uploads', express.static(uploadsDir));
  if (fs.existsSync(desktopServerDir)) {
    app.use('/server-images', express.static(desktopServerDir));
  }
}

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
