import Customer from '../models/Customer.js';
import Style from '../models/Style.js';
import User from '../models/User.js';
import ExcelImport from '../models/ExcelImport.js';
import ShareLink from '../models/ShareLink.js';
import Category from '../models/Category.js';
import CategoryGroup from '../models/CategoryGroup.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { expandStylesForCustomer } from '../utils/styleCustomerExpansion.js';
import { getActiveKtList } from '../utils/ktHelper.js';
import { formatDateTimeIST } from '../utils/dateUtils.js';

/**
 * @desc    Fetch content for a public shared token link ("Without Login" or "With Login")
 *          Supports both Customer specific share links and Category share links
 * @route   GET /api/shared/:token
 * @access  Public / Optional Bearer (Validated by cryptographically secure token + customer/link dates + status + login)
 */
export const getSharedContent = async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Look up customer by master shareToken directly (or _id fallback)
    let customer = await Customer.findOne({ shareToken: token }).populate('assignedCategories', 'name');
    if (!customer && token.match(/^[0-9a-fA-F]{24}$/)) {
      customer = await Customer.findById(token).populate('assignedCategories', 'name');
    }

    // 1b. Check if token matches a customer's specific categoryAccess shareToken
    let specificCategoryAccess = null;
    if (!customer) {
      customer = await Customer.findOne({ 'categoryAccess.shareToken': token }).populate('assignedCategories', 'name');
      if (customer) {
        specificCategoryAccess = customer.categoryAccess.find((ca) => ca.shareToken === token);
      }
    }

    // 2. If not a customer token, check if it is a Category ShareLink
    let shareLink = null;
    if (!customer) {
      shareLink = await ShareLink.findOne({ token }).populate('categories', 'name');
    }

    if (!customer && !shareLink) {
      return res.status(404).json({
        success: false,
        message: 'This sharing link is invalid or has been revoked by Shraddha Gold administration.'
      });
    }

    // -------------------------------------------------------------
    // CASE A: CATEGORY SHARE LINK
    // -------------------------------------------------------------
    if (shareLink) {
      // Validate Status
      if (shareLink.status !== 'Active') {
        return res.status(403).json({
          success: false,
          isExpired: true,
          message: 'This category portfolio link is inactive or has been revoked.'
        });
      }

      // Validate Date Window
      const now = new Date();
      if (shareLink.accessStart && now < new Date(shareLink.accessStart)) {
        return res.status(403).json({
          success: false,
          notYetActive: true,
          accessStart: shareLink.accessStart,
          message: `This category portfolio is scheduled to activate on ${formatDateTimeIST(shareLink.accessStart)}.`
        });
      }

      if (shareLink.accessEnd && now > new Date(shareLink.accessEnd)) {
        shareLink.status = 'Expired';
        await shareLink.save();
        return res.status(403).json({
          success: false,
          isExpired: true,
          accessEnd: shareLink.accessEnd,
          message: `This category link expired on ${formatDateTimeIST(shareLink.accessEnd)}. Please contact Shraddha Gold for an updated link.`
        });
      }

      // Validate "With Login" if requested
      const accessType = shareLink.accessType || 'Without Login';
      let authenticatedUser = null;

      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
          const authToken = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(
            authToken,
            process.env.JWT_SECRET || 'shraddha_gold_luxury_manufacturing_jwt_secret_key_2026'
          );
          if (decoded?.id) {
            authenticatedUser = await User.findById(decoded.id).select('-password');
          }
        } catch (tokenErr) {
          // Token invalid or expired - ignore and treat as unauthenticated
        }
      }

      if (accessType === 'With Login' && !authenticatedUser) {
        return res.status(200).json({
          success: true,
          requiresLogin: true,
          portfolio: {
            customerName: shareLink.title || 'Category Collection',
            companyName: 'Shraddha Gold',
            city: '',
            accessType: 'With Login',
            accessStart: shareLink.accessStart,
            accessEnd: shareLink.accessEnd,
            primaryPhone: '',
            phones: [],
            token: shareLink.token,
            isCategoryLink: true
          }
        });
      }

      // Determine authorized categories
      let authorizedCategories = [];
      if (shareLink.scope === 'AllCategories' || !shareLink.categoryNames || shareLink.categoryNames.length === 0) {
        const allCategories = await Category.find().select('name');
        authorizedCategories = allCategories.map((c) => c.name);
      } else {
        authorizedCategories = shareLink.categoryNames;
      }

      // Query styles
      const rawStyles = await Style.find({
        categoryName: { $in: authorizedCategories },
        status: 'Active'
      }).sort({ categoryName: 1, styleCode: 1 });

      // Expand items/KT variants into separate product entries for Shared Link
      let styles = expandStylesForCustomer(rawStyles);

      // Filter by KT if shareLink specifies kts
      if (Array.isArray(shareLink.kts) && shareLink.kts.length > 0 && !shareLink.kts.includes('All')) {
        const normKts = shareLink.kts.map((k) => k.replace(/\s*KT/i, '').trim().toUpperCase());
        styles = styles.filter((s) => {
          const cand = `${s.purity || ''} ${s.item || ''} ${s.itemCode || ''}`.toUpperCase();
          return normKts.some((k) => cand.includes(k));
        });
      }

      // Increment view counter asynchronously
      ShareLink.findByIdAndUpdate(shareLink._id, { $inc: { viewsCount: 1 } }).exec();

      // Query latest completed Excel import metadata
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

      const allGroups = await CategoryGroup.find({ status: 'Active' })
        .select('_id name description categories categoryNames')
        .lean();
      const categoryGroups = allGroups.filter((grp) => {
        const names = Array.isArray(grp.categoryNames) ? grp.categoryNames : [];
        return names.some((cn) => authorizedCategories.includes(cn));
      });

      return res.status(200).json({
        success: true,
        requiresLogin: false,
        portfolio: {
          customerName: shareLink.title || 'Category Catalog',
          companyName: 'Shraddha Gold India Pvt. Ltd.',
          city: '',
          primaryPhone: '',
          phones: [],
          accessType,
          accessStart: shareLink.accessStart,
          accessEnd: shareLink.accessEnd,
          categories: authorizedCategories,
          styles,
          categoryGroups,
          excelColumns,
          availableItems: await getActiveKtList(),
          availableKts: await getActiveKtList(),
          latestImport: latestImport
            ? {
                _id: latestImport._id,
                fileName: latestImport.fileName,
                uploadDateTime: latestImport.uploadDateTime,
                totalRows: latestImport.totalRows
              }
            : null,
          token: shareLink.token,
          isCategoryLink: true,
          shareLinkId: shareLink._id
        }
      });
    }

    // -------------------------------------------------------------
    // CASE B: CUSTOMER SPECIFIC SHARE LINK
    // -------------------------------------------------------------
    // 1. Validate Customer Status
    if (customer.status !== 'Active') {
      return res.status(403).json({
        success: false,
        isExpired: true,
        message: 'Access temporarily suspended. Please contact Shraddha Gold commercial desk.'
      });
    }

    // 2. Validate Access Date & Time Window
    const now = new Date();
    if (customer.accessStart && now < new Date(customer.accessStart)) {
      return res.status(403).json({
        success: false,
        notYetActive: true,
        accessStart: customer.accessStart,
        message: `This portfolio is scheduled to activate on ${formatDateTimeIST(customer.accessStart)}.`
      });
    }

    if (customer.accessEnd && now > new Date(customer.accessEnd)) {
      // Automatically deactivate customer account and linked user
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
        message: `This portfolio access window expired on ${formatDateTimeIST(customer.accessEnd)}. Please request an extension from Shraddha Gold.`
      });
    }

    // 3. Validate Shared Link Expiry (governed by Delay / Share Time)
    if (specificCategoryAccess) {
      if (specificCategoryAccess.shareLinkExpiresAt && now > new Date(specificCategoryAccess.shareLinkExpiresAt)) {
        return res.status(403).json({
          success: false,
          isExpired: true,
          shareLinkExpiresAt: specificCategoryAccess.shareLinkExpiresAt,
          message: `The portfolio link for "${specificCategoryAccess.categoryName}" expired on ${formatDateTimeIST(specificCategoryAccess.shareLinkExpiresAt)}. Please contact Shraddha Gold for an updated link.`
        });
      }
    } else {
      if (customer.shareLinkExpiresAt && now > new Date(customer.shareLinkExpiresAt)) {
        return res.status(403).json({
          success: false,
          isExpired: true,
          shareLinkExpiresAt: customer.shareLinkExpiresAt,
          message: `This portfolio sharing link expired on ${new Date(customer.shareLinkExpiresAt).toLocaleString('en-IN')}. Please contact Shraddha Gold for an updated link.`
        });
      }
    }

    // 3. Check "With Login" authorization
    const accessType = customer.linkShareType || 'Without Login';
    let authenticatedUser = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const authToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(
          authToken,
          process.env.JWT_SECRET || 'shraddha_gold_luxury_manufacturing_jwt_secret_key_2026'
        );
        if (decoded?.id) {
          authenticatedUser = await User.findById(decoded.id).select('-password');
        }
      } catch (tokenErr) {
        // Token invalid or expired - ignore and treat as unauthenticated
      }
    }

    if (accessType === 'With Login') {
      let isAuthorized = false;
      if (authenticatedUser) {
        if (authenticatedUser.role === 'admin') {
          isAuthorized = true;
        } else if (
          (customer.user && String(customer.user) === String(authenticatedUser._id)) ||
          (customer.email && customer.email.toLowerCase() === (authenticatedUser.email || '').toLowerCase()) ||
          (customer.phones && (
            Array.isArray(authenticatedUser.mobile) 
              ? authenticatedUser.mobile.some(m => customer.phones.includes(m))
              : customer.phones.includes(authenticatedUser.mobile)
          ))
        ) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(200).json({
          success: true,
          requiresLogin: true,
          portfolio: {
            customerName: customer.name,
            companyName: customer.name,
            city: customer.city,
            accessType: 'With Login',
            accessStart: customer.accessStart,
            accessEnd: customer.accessEnd,
            primaryPhone: customer.primaryPhone || '',
            phones: Array.isArray(customer.phones) && customer.phones.length > 0
              ? customer.phones
              : (customer.primaryPhone ? [customer.primaryPhone] : []),
            panelTabAccess: customer.panelTabAccess || ['ready', 'all'],
            token: specificCategoryAccess ? specificCategoryAccess.shareToken : (customer.shareToken || token),
            customerId: customer._id
          }
        });
      }
    }

    // 4. Determine strictly authorized categories
    let authorizedCategories = [];
    if (specificCategoryAccess) {
      authorizedCategories = [specificCategoryAccess.categoryName];
    } else if (customer.assignedCategories && customer.assignedCategories.length > 0) {
      authorizedCategories = customer.assignedCategories.map((c) => (typeof c === 'object' && c.name ? c.name : c));
    }

    // 5. Query styles STRICTLY constrained to authorized categories
    const rawStyles = await Style.find({
      categoryName: { $in: authorizedCategories },
      status: 'Active'
    }).sort({ categoryName: 1, styleCode: 1 });

    // Expand items/KT variants into separate product entries for Shared Link
    let styles = expandStylesForCustomer(rawStyles);

    // Granular KT filtering per category
    if (specificCategoryAccess) {
      if (Array.isArray(specificCategoryAccess.kts) && specificCategoryAccess.kts.length > 0 && !specificCategoryAccess.kts.includes('All')) {
        const allowedNorm = specificCategoryAccess.kts.map((k) => k.replace(/\s*KT/i, '').trim().toUpperCase());
        styles = styles.filter((s) => {
          const cand = `${s.purity || ''} ${s.item || ''} ${s.itemCode || ''}`.toUpperCase();
          return allowedNorm.some((k) => cand.includes(k));
        });
      }
    } else if (Array.isArray(customer.categoryAccess) && customer.categoryAccess.length > 0) {
      const catAccessMap = new Map();
      customer.categoryAccess.forEach((ca) => {
        const cName = (ca.categoryName || (ca.category && ca.category.name) || '').trim().toLowerCase();
        if (cName && Array.isArray(ca.kts) && ca.kts.length > 0) {
          catAccessMap.set(cName, ca.kts.map((k) => k.replace(/\s*KT/i, '').trim().toUpperCase()));
        }
      });

      if (catAccessMap.size > 0) {
        styles = styles.filter((s) => {
          const catLower = (s.categoryName || '').trim().toLowerCase();
          const allowedForCat = catAccessMap.get(catLower);
          if (!allowedForCat || allowedForCat.length === 0) return true; // not restricted
          const cand = `${s.purity || ''} ${s.item || ''} ${s.itemCode || ''}`.toUpperCase();
          return allowedForCat.some((k) => cand.includes(k));
        });
      }
    }

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

    const allGroups = await CategoryGroup.find({ status: 'Active' })
      .select('_id name description categories categoryNames')
      .lean();
    const categoryGroups = allGroups.filter((grp) => {
      const names = Array.isArray(grp.categoryNames) ? grp.categoryNames : [];
      return names.some((cn) => authorizedCategories.includes(cn));
    });

    res.status(200).json({
      success: true,
      requiresLogin: false,
      portfolio: {
        customerName: specificCategoryAccess ? `${customer.name} - ${specificCategoryAccess.categoryName}` : customer.name,
        companyName: customer.name,
        categoryName: specificCategoryAccess ? specificCategoryAccess.categoryName : null,
        isSpecificCategoryLink: !!specificCategoryAccess,
        city: customer.city,
        primaryPhone: customer.primaryPhone || '',
        phones: Array.isArray(customer.phones) && customer.phones.length > 0
          ? customer.phones
          : (customer.primaryPhone ? [customer.primaryPhone] : []),
        accessType,
        accessStart: customer.accessStart,
        accessEnd: customer.accessEnd,
        shareLinkExpiresAt: specificCategoryAccess ? specificCategoryAccess.shareLinkExpiresAt : customer.shareLinkExpiresAt,
        panelTabAccess: customer.panelTabAccess || ['ready', 'all'],
        categories: authorizedCategories,
        styles,
        categoryGroups,
        excelColumns,
        availableItems: await getActiveKtList(),
        availableKts: specificCategoryAccess?.kts?.length > 0 ? specificCategoryAccess.kts : await getActiveKtList(),
        latestImport: latestImport ? {
          _id: latestImport._id,
          fileName: latestImport.fileName,
          uploadDateTime: latestImport.uploadDateTime,
          totalRows: latestImport.totalRows
        } : null,
        token: specificCategoryAccess ? specificCategoryAccess.shareToken : (customer.shareToken || token),
        customerId: customer._id
      }
    });
  } catch (error) {
    console.error('[getSharedContent Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load portfolio content',
      error: error.message
    });
  }
};

/**
 * @desc    Generate a category-wise share link
 * @route   POST /api/admin/category-links
 * @access  Private (Admin)
 */
export const createCategoryShareLink = async (req, res) => {
  try {
    const {
      title,
      categoryNames = [],
      categoryIds = [],
      categoryGroups = [],
      categoryGroupNames = [],
      kts = [],
      scope = 'Category',
      accessType = 'Without Login',
      durationDays = 0,
      notes = ''
    } = req.body;

    let finalCategoryNames = Array.isArray(categoryNames) ? [...categoryNames] : [];
    let finalCategoryIds = Array.isArray(categoryIds) ? [...categoryIds] : [];
    let finalGroupNames = Array.isArray(categoryGroupNames) ? [...categoryGroupNames] : [];
    let finalGroupIds = Array.isArray(categoryGroups) ? [...categoryGroups] : [];

    // If Category Groups are selected but categoryNames is empty, resolve categories from groups
    if (finalCategoryNames.length === 0 && (finalGroupIds.length > 0 || finalGroupNames.length > 0)) {
      const foundGroups = await CategoryGroup.find({
        $or: [
          { _id: { $in: finalGroupIds.filter((id) => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) } },
          { name: { $in: finalGroupNames } }
        ]
      });
      foundGroups.forEach((g) => {
        if (Array.isArray(g.categoryNames)) {
          finalCategoryNames.push(...g.categoryNames);
        }
        if (!finalGroupNames.includes(g.name)) finalGroupNames.push(g.name);
        if (!finalGroupIds.includes(g._id)) finalGroupIds.push(g._id);
      });
      finalCategoryNames = Array.from(new Set(finalCategoryNames));
    }

    // Manual link requires at least one category unless scope is explicitly AllCategories
    if (finalCategoryNames.length === 0 && scope !== 'AllCategories') {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one category or category group to generate a share link.'
      });
    }

    // If scope is explicitly AllCategories or empty, fetch all active categories
    if (scope === 'AllCategories' || finalCategoryNames.length === 0) {
      const allCats = await Category.find().select('_id name');
      finalCategoryNames = allCats.map((c) => c.name);
      finalCategoryIds = allCats.map((c) => c._id);
    }

    // Calculate expiry date if durationDays provided
    let accessEnd = null;
    if (Number(durationDays) > 0) {
      accessEnd = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);
    }

    // Generate unique crypto token
    const token = crypto.randomBytes(16).toString('hex');

    const defaultTitle =
      scope === 'AllCategories'
        ? 'Complete Master Collection (Manual)'
        : finalCategoryNames.length === 1
        ? `${finalCategoryNames[0]} Collection`
        : `${finalCategoryNames.length} Categories Collection`;

    const shareLink = await ShareLink.create({
      token,
      title: (title || '').trim() || defaultTitle,
      categoryNames: finalCategoryNames,
      categories: finalCategoryIds,
      categoryGroups: finalGroupIds,
      categoryGroupNames: finalGroupNames,
      kts: Array.isArray(kts) ? kts : [],
      scope: scope === 'AllCategories' ? 'AllCategories' : 'Category',
      isDefault: false, // Manual link is never the system default master
      accessType: accessType === 'With Login' ? 'With Login' : 'Without Login',
      accessStart: new Date(),
      accessEnd,
      status: 'Active',
      createdBy: req.user?._id,
      notes
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const fullShareUrl = `${clientUrl}/shared/${token}`;

    res.status(201).json({
      success: true,
      message: 'Category share link generated successfully',
      shareLink: {
        ...shareLink.toObject(),
        url: fullShareUrl
      }
    });
  } catch (error) {
    console.error('[createCategoryShareLink Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate category share link',
      error: error.message
    });
  }
};

/**
 * @desc    Get default master share link (All Categories - Auto-Generated & Permanent)
 * @route   GET /api/admin/category-links/default
 * @access  Private (Admin)
 */
export const getDefaultMasterShareLink = async (req, res) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let defaultLink = await ShareLink.findOne({ isDefault: true, status: 'Active' });
    if (!defaultLink) {
      defaultLink = await ShareLink.findOne({ scope: 'AllCategories', status: 'Active' });
      if (defaultLink) {
        defaultLink.isDefault = true;
        await defaultLink.save();
      } else {
        const allCats = await Category.find().select('_id name');
        const token = 'master-' + crypto.randomBytes(12).toString('hex');
        defaultLink = await ShareLink.create({
          token,
          title: 'Fine Jewellery Master Collection (All Categories)',
          categoryNames: allCats.map((c) => c.name),
          categories: allCats.map((c) => c._id),
          scope: 'AllCategories',
          isDefault: true,
          accessType: 'Without Login',
          accessStart: new Date(),
          accessEnd: null,
          status: 'Active',
          notes: 'System auto-generated default master catalog link for all categories'
        });
      }
    }

    res.status(200).json({
      success: true,
      defaultLink: {
        ...defaultLink.toObject(),
        url: `${clientUrl}/shared/${defaultLink.token}`
      }
    });
  } catch (error) {
    console.error('[getDefaultMasterShareLink Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default master share link',
      error: error.message
    });
  }
};

/**
 * @desc    Get all category-wise share links (default master + manual custom links)
 * @route   GET /api/admin/category-links
 * @access  Private (Admin)
 */
export const getCategoryShareLinks = async (req, res) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Ensure default master link for All Categories is automatically generated
    let defaultLink = await ShareLink.findOne({ isDefault: true, status: 'Active' });
    if (!defaultLink) {
      defaultLink = await ShareLink.findOne({ scope: 'AllCategories', status: 'Active' });
      if (defaultLink) {
        defaultLink.isDefault = true;
        await defaultLink.save();
      } else {
        const allCats = await Category.find().select('_id name');
        const token = 'master-' + crypto.randomBytes(12).toString('hex');
        defaultLink = await ShareLink.create({
          token,
          title: 'Fine Jewellery Master Collection (All Categories)',
          categoryNames: allCats.map((c) => c.name),
          categories: allCats.map((c) => c._id),
          scope: 'AllCategories',
          isDefault: true,
          accessType: 'Without Login',
          accessStart: new Date(),
          accessEnd: null,
          status: 'Active',
          notes: 'System auto-generated default master catalog link for all categories'
        });
      }
    }

    // Fetch manual custom links (excluding default link)
    const manualLinks = await ShareLink.find({ isDefault: { $ne: true } }).sort({ createdAt: -1 });

    const now = new Date();
    const formattedManualLinks = manualLinks.map((link) => {
      const obj = link.toObject();
      let currentStatus = obj.status;
      if (obj.status === 'Active' && obj.accessEnd && now > new Date(obj.accessEnd)) {
        currentStatus = 'Expired';
      }
      return {
        ...obj,
        status: currentStatus,
        url: `${clientUrl}/shared/${obj.token}`
      };
    });

    const formattedDefault = defaultLink
      ? {
          ...defaultLink.toObject(),
          url: `${clientUrl}/shared/${defaultLink.token}`
        }
      : null;

    res.status(200).json({
      success: true,
      defaultLink: formattedDefault,
      links: formattedManualLinks
    });
  } catch (error) {
    console.error('[getCategoryShareLinks Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category share links',
      error: error.message
    });
  }
};

/**
 * @desc    Delete or revoke a category share link (Default master link is protected)
 * @route   DELETE /api/admin/category-links/:id
 * @access  Private (Admin)
 */
export const deleteCategoryShareLink = async (req, res) => {
  try {
    const link = await ShareLink.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Share link not found' });
    }

    if (link.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'The system default master link cannot be deleted as it is automatically maintained for all categories.'
      });
    }

    await ShareLink.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category share link removed successfully'
    });
  } catch (error) {
    console.error('[deleteCategoryShareLink Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category share link',
      error: error.message
    });
  }
};
