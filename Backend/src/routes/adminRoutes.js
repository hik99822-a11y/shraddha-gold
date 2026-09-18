import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { excelUpload, imageUpload, bulkImageUpload } from '../middleware/uploadMiddleware.js';

import { getAdminDashboardStats } from '../controllers/adminDashboardController.js';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  generateCustomerLink,
  scheduleCustomerShare,
  generateCustomerPdf
} from '../controllers/customerController.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import {
  getCategoryGroups,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup
} from '../controllers/categoryGroupController.js';
import {
  getStyleImages,
  uploadSlotImage,
  copySlotToAllKt,
  deleteSlotImage,
  processBulkImageChunk,
  getUnmatchedImages,
  generateCatalogPdf,
  syncDesktopServerImages
} from '../controllers/styleImageController.js';
import {
  uploadExcelStock,
  getExcelHistory,
  getLiveStock,
  deleteStockRow,
  deleteStockRows,
  clearAllStock,
  deleteExcelHistory,
  getStockAvailability,
  getDetectedKts
} from '../controllers/excelStockController.js';
import {
  createCategoryShareLink,
  getCategoryShareLinks,
  getDefaultMasterShareLink,
  deleteCategoryShareLink
} from '../controllers/shareLinkController.js';

const router = express.Router();

// Enforce authentication & Admin role for all admin routes
router.use(protect);
router.use(authorizeRoles('admin'));

// 1. Dashboard
router.get('/dashboard', getAdminDashboardStats);

// 2. Customers
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.get('/customers/:id', getCustomerById);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.post('/customers/:id/links', generateCustomerLink);
router.post('/customers/:id/schedule-share', scheduleCustomerShare);
router.post('/customers/:id/pdf', generateCustomerPdf);

// 3. Categories & Category Groups
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/category-groups', getCategoryGroups);
router.post('/category-groups', createCategoryGroup);
router.put('/category-groups/:id', updateCategoryGroup);
router.delete('/category-groups/:id', deleteCategoryGroup);

// 4. Style Images
router.get('/style-images', getStyleImages);
router.post('/style-images/:id/slot', imageUpload.single('image'), uploadSlotImage);
router.post('/style-images/:id/copy-slot-all', copySlotToAllKt);
router.delete('/style-images/:id/slot', deleteSlotImage);
router.post('/style-images/bulk-chunk', bulkImageUpload.array('files', 100), processBulkImageChunk);
router.post('/style-images/sync-server-folder', syncDesktopServerImages);
router.get('/style-images/unmatched', getUnmatchedImages);
router.post('/style-images/generate-pdf', generateCatalogPdf);

// Category Share Links (Managed from Style Images / Catalog)
router.get('/category-links/default', getDefaultMasterShareLink);
router.get('/category-links', getCategoryShareLinks);
router.post('/category-links', createCategoryShareLink);
router.delete('/category-links/:id', deleteCategoryShareLink);

// 5. Excel Stock
router.post('/excel/upload', excelUpload.single('file'), uploadExcelStock);
router.get('/excel/history', getExcelHistory);
router.delete('/excel/history/:id', deleteExcelHistory);
router.get('/excel/stock', getLiveStock);
router.delete('/excel/stock/row/:rowId', deleteStockRow);
router.post('/excel/stock/delete-rows', deleteStockRows);
router.delete('/excel/stock/clear', clearAllStock);
router.get('/excel/stock/availability', getStockAvailability);
router.get('/excel/kts', getDetectedKts);

// 6. PDF Compress
import { pdfUpload } from '../middleware/uploadMiddleware.js';
import { compressPdf } from '../controllers/pdfCompressController.js';

router.post('/pdf-compress', pdfUpload.single('file'), compressPdf);

export default router;
