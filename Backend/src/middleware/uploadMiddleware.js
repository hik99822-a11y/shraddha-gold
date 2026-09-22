import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directories (Local fallback on AWS Linux if network share is remote)
const uploadsDir = (process.env.DESKTOP_SERVER_DIR && fs.existsSync(process.env.DESKTOP_SERVER_DIR))
  ? process.env.DESKTOP_SERVER_DIR
  : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
const styleImagesDir = path.join(uploadsDir, 'style-images');
const excelDir = path.join(uploadsDir, 'excel');
const pdfsDir = path.join(uploadsDir, 'pdfs');

// Ensure upload directories exist
[uploadsDir, styleImagesDir, excelDir, pdfsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Memory storage for Excel parsing
export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB Excel file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are supported'));
    }
  }
});

// Disk storage for single style images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, styleImagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanName}_${uniqueSuffix}${ext}`);
  }
});

export const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per image
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|avif)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, WEBP, and AVIF images are permitted'));
    }
  }
});

// Multer storage for chunked bulk folder upload
export const bulkImageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 100 * 1024 * 1024, files: 100 }
});

// Disk storage for PDFs
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanName}_${uniqueSuffix}${ext}`);
  }
});

export const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 5368709120 }, // 5 GB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf files are supported'));
    }
  }
});
