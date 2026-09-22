import Customer from '../models/Customer.js';
import Style from '../models/Style.js';
import User from '../models/User.js';
import ExcelImport from '../models/ExcelImport.js';
import Category from '../models/Category.js';
import CategoryGroup from '../models/CategoryGroup.js';
import { generateStylesPdf } from '../services/pdfGeneratorService.js';
import { expandStylesForCustomer } from '../utils/styleCustomerExpansion.js';
import { getActiveKtList } from '../utils/ktHelper.js';
import { formatDateTimeIST } from '../utils/dateUtils.js';

/**
 * @desc    Get Authenticated Customer Portal Content ("With Login")
 * @route   GET /api/customer/portal
 * @access  Private (Customer)
 */
export const getCustomerPortalContent = async (req, res) => {
  try {
    const user = req.user;

    // Resolve Customer portfolio mapping
    let customer = await Customer.findOne({
      $or: [
        { user: user._id },
        { email: user.email },
        { phones: user.mobile }
      ]
    }).populate('assignedCategories', 'name normalizedName');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'No commercial client portfolio is mapped to this user account. Please contact Shraddha Gold support.'
      });
    }

    // 1. Validate Customer Status
    if (customer.status !== 'Active') {
      return res.status(403).json({
        success: false,
        isDeactivated: true,
        message: 'Account access has been deactivated. Please contact Shraddha Gold administration.'
      });
    }

    // 2. Validate Access Date Window
    const now = new Date();
    if (customer.accessStart && now < new Date(customer.accessStart)) {
      return res.status(403).json({
        success: false,
        notYetActive: true,
        accessStart: customer.accessStart,
        message: `Your catalog access is scheduled to activate on ${formatDateTimeIST(customer.accessStart)}.`
      });
    }

    if (customer.accessEnd && now > new Date(customer.accessEnd)) {
      // Automatically mark customer account and linked user account Inactive
      if (customer.status === 'Active') {
        customer.status = 'Inactive';
        await customer.save();
      }
      if (customer.user) {
        await User.findByIdAndUpdate(customer.user, { isActive: false });
      }
      return res.status(403).json({
        success: false,
        isExpired: true,
        accessEnd: customer.accessEnd,
        message: `Your catalog access period concluded on ${formatDateTimeIST(customer.accessEnd)}. Your account is now inactive. Please contact your Shraddha Gold account manager for renewal.`
      });
    }

    // 3. Extract STRICTLY assigned categories
    const assignedCategoryNames = customer.assignedCategories.map((c) => c.name);
    const assignedCategoryIds = customer.assignedCategories.map((c) => (c._id ? c._id.toString() : c.toString()));

    // 4. Query styles belonging ONLY to assigned categories
    const rawStyles = await Style.find({
      categoryName: { $in: assignedCategoryNames },
      status: 'Active'
    }).sort({ categoryName: 1, styleCode: 1 });

    // Expand items/KT variants into separate product entries for Customer Portal
    const styles = expandStylesForCustomer(rawStyles);

    // 5. Query active Category Groups relevant to assigned categories
    const allGroups = await CategoryGroup.find({ status: 'Active' })
      .select('_id name description categories categoryNames')
      .lean();

    const categoryGroups = allGroups.filter((grp) => {
      const names = Array.isArray(grp.categoryNames) ? grp.categoryNames : [];
      const ids = Array.isArray(grp.categories) ? grp.categories.map((id) => id.toString()) : [];
      return (
        names.some((cn) => assignedCategoryNames.includes(cn)) ||
        ids.some((cid) => assignedCategoryIds.includes(cid))
      );
    });

    // 6. Query latest completed Excel import metadata and detectedColumns
    const latestImport = await ExcelImport.findOne({ status: 'Completed' })
      .sort({ uploadDateTime: -1 })
      .select('detectedColumns fileName uploadDateTime totalRows');

    let excelColumns = latestImport?.detectedColumns || [];
    if (excelColumns.length === 0 && styles.length > 0) {
      const keySet = new Set();
      for (const s of styles.slice(0, 50)) {
        if (s.rawData) {
          Object.keys(s.rawData).forEach((k) => {
            if (k !== '_id' && k !== '__v') keySet.add(k);
          });
        }
      }
      excelColumns = Array.from(keySet);
    }

    res.status(200).json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        companyName: customer.name,
        city: customer.city,
        email: customer.email,
        primaryPhone: customer.primaryPhone,
        accessStart: customer.accessStart,
        accessEnd: customer.accessEnd,
        assignedCategories: assignedCategoryNames,
        panelTabAccess: customer.panelTabAccess || ['ready', 'all']
      },
      styles,
      categoryGroups,
      excelColumns,
      availableItems: await getActiveKtList(),
      availableKts: await getActiveKtList(),
      latestImport: latestImport ? {
        _id: latestImport._id,
        fileName: latestImport.fileName,
        uploadDateTime: latestImport.uploadDateTime,
        totalRows: latestImport.totalRows
      } : null
    });
  } catch (error) {
    console.error('[getCustomerPortalContent Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve portal collections',
      error: error.message
    });
  }
};

/**
 * @desc    Generate customer-specific PDF from portal
 * @route   POST /api/customer/portal/pdf
 * @access  Private (Customer)
 */
export const downloadCustomerPortalPdf = async (req, res) => {
  try {
    const user = req.user;
    const customer = await Customer.findOne({
      $or: [
        { user: user._id },
        { email: user.email },
        { phones: user.mobile }
      ]
    }).populate('assignedCategories');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer portfolio not found' });
    }

    const assignedCategoryNames = customer.assignedCategories.map((c) => c.name);
    const { quality = 'high' } = req.body || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SG_Customer_Catalog_${Date.now()}.pdf"`);

    await generateStylesPdf({
      type: 'Customer',
      targetId: customer._id.toString(),
      targetName: `${customer.name} Curated Portfolio`,
      styleQuery: {
        categoryName: { $in: assignedCategoryNames }
      },
      quality,
      res
    });
    // Stream completed, do not send JSON
  } catch (error) {
    console.error('[downloadCustomerPortalPdf Error]:', error);
    res.status(500).json({ success: false, message: 'PDF request failed', error: error.message });
  }
};
