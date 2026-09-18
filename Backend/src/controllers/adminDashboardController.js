import Customer from '../models/Customer.js';
import Category from '../models/Category.js';
import Style from '../models/Style.js';
import ExcelImport from '../models/ExcelImport.js';
import Inquiry from '../models/Inquiry.js';
import Order from '../models/Order.js';

/**
 * @desc    Get Admin Dashboard Stats & Recent Activity
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
export const getAdminDashboardStats = async (req, res) => {
  try {
    // 1. Customer Summary
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ status: 'Active' });
    const inactiveCustomers = await Customer.countDocuments({ status: 'Inactive' });

    // 2. Category Summary
    const totalCategories = await Category.countDocuments({ status: 'Active' });

    // 3. Style Summary
    const totalStyles = await Style.countDocuments({ status: 'Active' });

    // 4. Customer Orders & Inquiries (Regular)
    const regularOrderCount = await Order.countDocuments({ orderType: { $ne: 'Make Stock' } });
    const inquiryCount = await Inquiry.countDocuments();
    const totalOrders = regularOrderCount + inquiryCount;

    const pendingRegularCount = await Order.countDocuments({ orderType: { $ne: 'Make Stock' }, status: 'Pending' });
    const pendingInquiryCount = await Inquiry.countDocuments({ status: { $in: ['New', 'In Review'] } });
    const pendingOrders = pendingRegularCount + pendingInquiryCount;

    // 4b. Make Stock Orders
    const makeStockCount = await Order.countDocuments({ orderType: 'Make Stock' });
    const pendingMakeStock = await Order.countDocuments({ orderType: 'Make Stock', status: 'Pending' });

    // Fetch recent placed regular orders first, fallback to inquiries
    const recentDbOrders = await Order.find({ orderType: { $ne: 'Make Stock' } })
      .sort({ createdAt: -1 })
      .limit(6);

    let recentOrders = [];
    if (recentDbOrders.length > 0) {
      recentOrders = recentDbOrders.map((ord) => ({
        _id: ord._id,
        fullName: ord.customerName,
        companyName: ord.customerName,
        phone: ord.customerPhone,
        email: ord.customerEmail || '—',
        subject: ord.orderNumber,
        category: `${ord.orderSource || 'Link Share'} (${ord.totalItems} items, ${ord.totalQuantity} pcs)`,
        estimatedVolume: `${Number(ord.totalGrossWeight || 0).toFixed(2)}g Gross`,
        styles: (ord.items || []).map((i) => i.styleCode).filter(Boolean),
        status: ord.status,
        pdfUrl: ord.pdfUrl,
        createdAt: ord.createdAt
      }));
    } else {
      const recentInquiries = await Inquiry.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('fullName companyName phone email subject category estimatedVolume status createdAt');
      recentOrders = recentInquiries;
    }

    // Fetch recent make stock orders
    const recentMakeStockDb = await Order.find({ orderType: 'Make Stock' })
      .sort({ createdAt: -1 })
      .limit(6);

    const recentMakeStock = recentMakeStockDb.map((ord) => ({
      _id: ord._id,
      fullName: ord.customerName,
      companyName: ord.customerName,
      phone: ord.customerPhone,
      email: ord.customerEmail || '—',
      subject: ord.orderNumber,
      category: `${ord.orderSource || 'Link Share'} (${ord.totalItems} items, ${ord.totalQuantity} pcs)`,
      estimatedVolume: `${Number(ord.totalGrossWeight || 0).toFixed(2)}g Gross`,
      styles: (ord.items || []).map((i) => i.styleCode).filter(Boolean),
      status: ord.status,
      pdfUrl: ord.pdfUrl,
      createdAt: ord.createdAt
    }));

    // 5. Excel Upload Summary
    const latestExcel = await ExcelImport.findOne()
      .select('-data')
      .sort({ uploadDateTime: -1 })
      .populate('uploadedBy', 'name email');

    res.status(200).json({
      success: true,
      stats: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          inactive: inactiveCustomers
        },
        categories: {
          total: totalCategories
        },
        styles: {
          total: totalStyles
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          recent: recentOrders
        },
        makeStock: {
          total: makeStockCount,
          pending: pendingMakeStock,
          recent: recentMakeStock
        },
        latestExcel: latestExcel
          ? {
              id: latestExcel._id,
              fileName: latestExcel.fileName,
              uploadDateTime: latestExcel.uploadDateTime,
              uploadedBy: latestExcel.uploadedBy?.name || 'Administrator',
              totalRows: latestExcel.totalRows,
              newRecords: latestExcel.newRecords,
              updatedRecords: latestExcel.updatedRecords,
              unchangedRecords: latestExcel.unchangedRecords,
              failedRows: latestExcel.failedRows,
              status: latestExcel.status
            }
          : null
      }
    });
  } catch (error) {
    console.error('[getAdminDashboardStats Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
};
