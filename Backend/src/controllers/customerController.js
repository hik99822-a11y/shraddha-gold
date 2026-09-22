import Customer from '../models/Customer.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Style from '../models/Style.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateStylesPdf } from '../services/pdfGeneratorService.js';
import { sendWhatsAppMessage } from '../services/metaApiService.js';
import { getActiveKtList } from '../utils/ktHelper.js';
import { formatDateTimeIST } from '../utils/dateUtils.js';

/**
 * @desc    Get all customers with pagination & filtering
 * @route   GET /api/admin/customers
 * @access  Private (Admin)
 */
export const getCustomers = async (req, res) => {
  try {
    const now = new Date();
    // Real-time automatic deactivation of accounts whose access end date & time has expired
    const expiredCustomers = await Customer.find({
      status: 'Active',
      accessEnd: { $lte: now }
    }).select('_id');

    if (expiredCustomers.length > 0) {
      const expiredIds = expiredCustomers.map((c) => c._id);

      await Customer.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'Inactive', isActive: false } }
      );
    }

    const { search, status, page = 1, limit = 15 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { city: searchRegex },
        { email: searchRegex },
        { phones: searchRegex }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate('assignedCategories', 'name normalizedName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      customers,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('[getCustomers Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
  }
};

/**
 * @desc    Get single customer by ID
 * @route   GET /api/admin/customers/:id
 * @access  Private (Admin)
 */
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedCategories');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Real-time automatic deactivation check on fetch
    if (customer.status === 'Active' && customer.accessEnd && new Date(customer.accessEnd) <= new Date()) {
      customer.status = 'Inactive';
      customer.isActive = false;
      await customer.save();
    }

    res.status(200).json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('[getCustomerById Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer details', error: error.message });
  }
};

/**
 * @desc    Create new customer
 * @route   POST /api/admin/customers
 * @access  Private (Admin)
 */
export const createCustomer = async (req, res) => {
  try {
    const {
      name,
      businessName,
      email,
      phones, // Array of phone numbers
      contacts, // Array of { name, phone }
      primaryPhone,
      city,
      status = 'Active',
      assignedCategories = [],
      categoryAccess = [],
      shareFormat = 'Link',
      accessStart,
      accessEnd,
      notes,
      linkShareType = 'Without Login',
      linkShareTime = '10:00',
      linkShareAfterDays = 0,
      linkValidityDays = 1,
      createLoginAccount, // boolean
      username,
      password,
      panelTabAccess
    } = req.body;

    const bName = (businessName || name || '').trim();
    if (!bName) {
      return res.status(400).json({ success: false, message: 'Business Name is required' });
    }

    // Process contacts list
    let contactList = Array.isArray(contacts)
      ? contacts.filter((c) => c && (c.phone || c.name))
      : [];

    let phoneList = Array.isArray(phones) ? phones.filter((p) => p && p.trim()) : [];

    // Sync phoneList from contacts if contacts provided
    if (contactList.length > 0) {
      contactList.forEach((c) => {
        const p = (c.phone || '').trim();
        if (p && !phoneList.includes(p)) phoneList.push(p);
      });
    } else if (phoneList.length > 0) {
      contactList = phoneList.map((p) => ({ name: bName, phone: p }));
    }

    if (primaryPhone && primaryPhone.trim() && !phoneList.includes(primaryPhone.trim())) {
      phoneList.unshift(primaryPhone.trim());
    }

    if (phoneList.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one phone number is required' });
    }

    const mainPhone = phoneList[0];

    let endDateTime;
    if (accessEnd) {
      endDateTime = new Date(accessEnd);
    } else {
      const startDateTime = accessStart ? new Date(accessStart) : new Date();
      endDateTime = new Date(startDateTime.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    if (!endDateTime || isNaN(endDateTime.getTime())) {
      endDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Automatically set status to Inactive if accessEnd is in the past
    const isExpired = endDateTime <= new Date();
    const finalStatus = isExpired ? 'Inactive' : status;

    let customerPassword = undefined;
    let customerUsername = '';
    // Handle optional user account credentials for With-Login
    if (createLoginAccount && password) {
      customerPassword = password;
      customerUsername = (username || bName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 1000)).trim();
    }

    // Resolve assigned categories from categoryAccess if provided
    let finalAssignedCategories = Array.isArray(assignedCategories) ? [...assignedCategories] : [];
    if (Array.isArray(categoryAccess) && categoryAccess.length > 0) {
      const catIdsFromAccess = categoryAccess.map((ca) => ca.category).filter(Boolean);
      finalAssignedCategories = Array.from(new Set([...finalAssignedCategories, ...catIdsFromAccess]));
    }

    const customer = await Customer.create({
      name: bName,
      businessName: bName,
      email: email ? email.trim().toLowerCase() : '',
      username: customerUsername,
      contacts: contactList,
      phones: phoneList,
      city: city?.trim() || '',
      status: finalStatus,
      categoryAccess: Array.isArray(categoryAccess) ? categoryAccess : [],
      assignedCategories: finalAssignedCategories,
      shareFormat: shareFormat === 'PDF' ? 'PDF' : 'Link',
      accessStart: accessStart ? new Date(accessStart) : new Date(),
      accessEnd: endDateTime,
      password: customerPassword,
      plainPassword: customerPassword || '',
      isActive: finalStatus === 'Active',
      role: 'customer',
      notes: notes || '',
      linkShareType: linkShareType === 'With Login' ? 'With Login' : 'Without Login',
      linkShareTime: linkShareTime ? linkShareTime.trim() : '10:00',
      linkShareAfterDays: !isNaN(parseInt(linkShareAfterDays, 10)) ? Math.max(0, parseInt(linkShareAfterDays, 10)) : 0,
      linkValidityDays: !isNaN(parseInt(linkValidityDays, 10)) ? Math.max(1, parseInt(linkValidityDays, 10)) : 1,
      panelTabAccess: Array.isArray(panelTabAccess) ? panelTabAccess : ['ready', 'all']
    });

    const populated = await Customer.findById(customer._id)
      .populate('assignedCategories', 'name normalizedName');

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer: populated
    });
  } catch (error) {
    console.error('[createCustomer Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
  }
};

/**
 * @desc    Update existing customer
 * @route   PUT /api/admin/customers/:id
 * @access  Private (Admin)
 */
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const {
      name,
      businessName,
      email,
      phones,
      contacts,
      primaryPhone,
      city,
      status,
      assignedCategories,
      categoryAccess,
      shareFormat,
      accessStart,
      accessEnd,
      notes,
      linkShareType,
      linkShareTime,
      linkShareAfterDays,
      linkValidityDays,
      panelTabAccess
    } = req.body;

    const bName = (businessName || name || '').trim();
    if (bName) {
      customer.name = bName;
      customer.businessName = bName;
    }
    if (email !== undefined) customer.email = email.trim().toLowerCase();
    if (city !== undefined) customer.city = city.trim();
    if (shareFormat !== undefined) {
      customer.shareFormat = shareFormat === 'PDF' ? 'PDF' : 'Link';
    }
    if (categoryAccess !== undefined && Array.isArray(categoryAccess)) {
      customer.categoryAccess = categoryAccess;
      const catIdsFromAccess = categoryAccess.map((ca) => ca.category).filter(Boolean);
      if (catIdsFromAccess.length > 0) {
        customer.assignedCategories = Array.from(new Set([...(customer.assignedCategories || []), ...catIdsFromAccess]));
      }
    }
    if (contacts !== undefined && Array.isArray(contacts)) {
      customer.contacts = contacts.filter((c) => c && (c.phone || c.name));
      const extractedPhones = customer.contacts.map((c) => (c.phone || '').trim()).filter(Boolean);
      if (extractedPhones.length > 0) {
        customer.phones = extractedPhones;
      }
    }

    if (accessEnd) {
      customer.accessEnd = new Date(accessEnd);
      // Automatically deactivate if access end date & time is in the past
      if (customer.accessEnd <= new Date()) {
        customer.status = 'Inactive';
      }
    }

    if (status) {
      // Prevent setting to 'Active' if accessEnd is in the past
      if (status === 'Active' && customer.accessEnd && customer.accessEnd <= new Date()) {
        customer.status = 'Inactive';
      } else {
        customer.status = status;
      }
    }

    if (assignedCategories) customer.assignedCategories = assignedCategories;
    if (accessStart) customer.accessStart = new Date(accessStart);
    if (notes !== undefined) customer.notes = notes;

    if (linkShareType !== undefined) {
      customer.linkShareType = linkShareType === 'With Login' ? 'With Login' : 'Without Login';
    }
    if (linkShareTime !== undefined) {
      customer.linkShareTime = linkShareTime ? linkShareTime.trim() : '10:00';
    }
    if (linkShareAfterDays !== undefined) {
      customer.linkShareAfterDays = !isNaN(parseInt(linkShareAfterDays, 10)) ? Math.max(0, parseInt(linkShareAfterDays, 10)) : 0;
    }
    if (linkValidityDays !== undefined) {
      customer.linkValidityDays = !isNaN(parseInt(linkValidityDays, 10)) ? Math.max(1, parseInt(linkValidityDays, 10)) : 1;
    }
    if (panelTabAccess !== undefined && Array.isArray(panelTabAccess)) {
      customer.panelTabAccess = panelTabAccess;
    }

    if (phones && Array.isArray(phones)) {
      const validPhones = phones.filter((p) => p && p.trim());
      if (validPhones.length > 0) {
        customer.phones = validPhones;
      }
    } else if (primaryPhone && primaryPhone.trim()) {
      if (!customer.phones) customer.phones = [];
      if (!customer.phones.includes(primaryPhone.trim())) {
        customer.phones.unshift(primaryPhone.trim());
      }
    }

    // Handle password update if supplied
    if (req.body.password && req.body.password.trim()) {
      const cleanPwd = req.body.password.trim();
      customer.password = cleanPwd;
      customer.plainPassword = cleanPwd;
    }
    
    // Allow updating username
    if (req.body.username !== undefined) {
      customer.username = req.body.username.trim().toLowerCase();
    }

    await customer.save();

    const updated = await Customer.findById(customer._id)
      .populate('assignedCategories', 'name normalizedName');

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer: updated
    });
  } catch (error) {
    console.error('[updateCustomer Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
  }
};

/**
 * @desc    Delete or deactivate customer
 * @route   DELETE /api/admin/customers/:id
 * @access  Private (Admin)
 */
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Delete customer
    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Customer successfully removed'
    });
  } catch (error) {
    console.error('[deleteCustomer Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
  }
};

/**
 * @desc    Generate customer-specific link (embedded in Customer document - no separate table)
 * @route   POST /api/admin/customers/:id/links
 * @access  Private (Admin)
 */
export const generateCustomerLink = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('assignedCategories');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { accessType = 'Without Login', selectedCategories } = req.body;

    // RULE 10: Admin should only be able to select categories that are already assigned to that customer!
    const assignedCategoryNames = (customer.assignedCategories || [])
      .map((c) => (c && typeof c === 'object' && c.name ? c.name : c))
      .filter(Boolean);
    let allowedCategories = [];

    if (selectedCategories && Array.isArray(selectedCategories) && selectedCategories.length > 0) {
      // Strictly filter to ensure only assigned categories are included
      allowedCategories = selectedCategories.filter((cat) => assignedCategoryNames.includes(cat));
      if (allowedCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected categories must be part of customer assigned categories.'
        });
      }
    } else {
      // Default to all assigned categories
      allowedCategories = assignedCategoryNames;
    }

    // Calculate share link expiration based on customer category delay
    let maxDelay = !isNaN(parseInt(customer.linkShareAfterDays, 10))
      ? Math.max(0, parseInt(customer.linkShareAfterDays, 10))
      : 0;
    let targetValidityDays = !isNaN(parseInt(customer.linkValidityDays, 10))
      ? Math.max(1, parseInt(customer.linkValidityDays, 10))
      : 1;
    let targetShareTime = customer.linkShareTime || '10:00';

    if (Array.isArray(customer.categoryAccess) && customer.categoryAccess.length > 0) {
      customer.categoryAccess.forEach((ca) => {
        const d = Number(ca.shareAfterDays || 0);
        if (d >= maxDelay) {
          maxDelay = d;
          targetValidityDays = !isNaN(parseInt(ca.validityDays, 10)) ? Math.max(1, parseInt(ca.validityDays, 10)) : targetValidityDays;
          if (ca.shareTime) targetShareTime = ca.shareTime;
        }
      });
    }

    const linkCreatedAt = new Date();
    const linkExpiresAt = new Date(linkCreatedAt.getTime());
    if (maxDelay === 0) {
      // 0 days delay: link is valid for N days from right now
      linkExpiresAt.setTime(linkCreatedAt.getTime() + targetValidityDays * 24 * 60 * 60 * 1000);
    } else {
      // N days delay: link dispatch is scheduled for N days at targetShareTime
      // The link should expire N days AFTER it is dispatched!
      const dispatchTime = new Date(linkCreatedAt.getTime());
      dispatchTime.setDate(dispatchTime.getDate() + maxDelay);
      
      if (targetShareTime && typeof targetShareTime === 'string' && targetShareTime.includes(':')) {
        const [h, m] = targetShareTime.split(':').map((v) => parseInt(v, 10));
        if (!isNaN(h) && !isNaN(m)) dispatchTime.setHours(h, m, 0, 0);
      }
      
      if (dispatchTime <= linkCreatedAt) {
        dispatchTime.setTime(linkCreatedAt.getTime());
      }
      
      // Expire validityDays after the calculated dispatch time
      linkExpiresAt.setTime(dispatchTime.getTime() + targetValidityDays * 24 * 60 * 60 * 1000);
    }

    // Generate master token and store directly on customer
    const token = crypto.randomBytes(16).toString('hex');
    customer.shareToken = token;
    customer.linkShareType = accessType;
    customer.shareLinkCreatedAt = linkCreatedAt;
    customer.shareLinkExpiresAt = linkExpiresAt;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const fullShareUrl = `${clientUrl}/shared/${token}`;

    // Generate separate token and expiry for each assigned category
    const categoryLinks = [];
    if (Array.isArray(customer.categoryAccess) && customer.categoryAccess.length > 0) {
      customer.categoryAccess = customer.categoryAccess.map((ca) => {
        const catDelay = !isNaN(parseInt(ca.shareAfterDays, 10)) ? Math.max(0, parseInt(ca.shareAfterDays, 10)) : 0;
        const catValidityDays = !isNaN(parseInt(ca.validityDays, 10)) ? Math.max(1, parseInt(ca.validityDays, 10)) : 1;
        const catShareTime = ca.shareTime || customer.linkShareTime || '10:00';
        const catExpiresAt = new Date(linkCreatedAt.getTime());

        if (catDelay === 0) {
          // 0 days delay: valid for N days from right now
          catExpiresAt.setTime(linkCreatedAt.getTime() + catValidityDays * 24 * 60 * 60 * 1000);
        } else {
          // N days delay: link dispatch is scheduled for N days at catShareTime
          // The link should expire N days AFTER it is dispatched!
          const catDispatchTime = new Date(linkCreatedAt.getTime());
          catDispatchTime.setDate(catDispatchTime.getDate() + catDelay);
          
          if (catShareTime && typeof catShareTime === 'string' && catShareTime.includes(':')) {
            const [h, m] = catShareTime.split(':').map((v) => parseInt(v, 10));
            if (!isNaN(h) && !isNaN(m)) catDispatchTime.setHours(h, m, 0, 0);
          }
          
          if (catDispatchTime <= linkCreatedAt) {
            catDispatchTime.setTime(linkCreatedAt.getTime());
          }
          
          // Expire validityDays after the scheduled dispatch time
          catExpiresAt.setTime(catDispatchTime.getTime() + catValidityDays * 24 * 60 * 60 * 1000);
        }

        const catToken = crypto.randomBytes(16).toString('hex');
        ca.shareToken = catToken;
        ca.shareLinkCreatedAt = linkCreatedAt;
        ca.shareLinkExpiresAt = catExpiresAt;

        // Calculate dispatch Schedule Time
        const dispatchDate = new Date(linkCreatedAt.getTime());
        dispatchDate.setDate(dispatchDate.getDate() + catDelay);
        if (catShareTime && typeof catShareTime === 'string' && catShareTime.includes(':')) {
          const [h, m] = catShareTime.split(':').map((v) => parseInt(v, 10));
          if (!isNaN(h) && !isNaN(m)) dispatchDate.setHours(h, m, 0, 0);
        }
        // If it's scheduled in the past for today, just set it to now so it sends immediately
        if (dispatchDate <= linkCreatedAt) {
          dispatchDate.setTime(linkCreatedAt.getTime());
        }
        
        ca.dispatchScheduledAt = dispatchDate;
        ca.dispatchStatus = 'Pending';

        const catId = ca.category && typeof ca.category === 'object' ? ca.category._id : ca.category;
        const catName = ca.categoryName || (ca.category && typeof ca.category === 'object' ? ca.category.name : '');

        categoryLinks.push({
          categoryId: catId,
          categoryName: catName,
          token: catToken,
          url: `${clientUrl}/shared/${catToken}`,
          shareFormat: ca.shareFormat || 'Link',
          shareTime: catShareTime,
          delayDays: catDelay,
          shareLinkExpiresAt: catExpiresAt,
          kts: ca.kts || []
        });

        return ca;
      });
    }

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Share links generated successfully',
      shareLink: {
        id: customer._id,
        token,
        url: fullShareUrl,
        accessType,
        allowedCategories,
        accessStart: customer.accessStart,
        accessEnd: customer.accessEnd,
        shareLinkExpiresAt: customer.shareLinkExpiresAt,
        createdAt: customer.shareLinkCreatedAt
      },
      categoryLinks
    });
  } catch (error) {
    console.error('[generateCustomerLink Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate link', error: error.message });
  }
};

/**
 * @desc    Schedule customer link sharing via Meta API (stored on Customer - no separate table)
 * @route   POST /api/admin/customers/:id/schedule-share
 * @access  Private (Admin)
 */
export const scheduleCustomerShare = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { scheduledDate, scheduledTime, targetPhone, sendImmediately, shareToken } = req.body;
    // Default to the first phone number if no targetPhone provided
    const phoneToSend = targetPhone || (customer.phones && customer.phones[0]) || '';
    const scheduledDateTime = scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`)
      : new Date();

    let linkExpiresAt = customer.shareLinkExpiresAt || customer.accessEnd;
    let categoryMatch = null;
    
    if (shareToken && Array.isArray(customer.categoryAccess)) {
      categoryMatch = customer.categoryAccess.find((ca) => ca.shareToken === shareToken);
      if (categoryMatch) {
        if (categoryMatch.shareLinkExpiresAt) {
          linkExpiresAt = categoryMatch.shareLinkExpiresAt;
        }
      }
    }

    // Update dispatch schedule in categoryAccess
    if (categoryMatch) {
      categoryMatch.dispatchScheduledAt = scheduledDateTime;
      categoryMatch.dispatchStatus = sendImmediately ? 'Sent' : 'Pending';
    } else {
      // If no specific category (e.g. master link), we don't have a specific field for master dispatch schedule now, 
      // but we can still send immediately.
    }

    // If immediate send requested
    if (sendImmediately) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const tokenToUse = shareToken || customer.shareToken || customer._id;
      const shareUrl = `${clientUrl}/shared/${tokenToUse}`;

      // Optionally handle PDF vs Link if categoryMatch has shareFormat === 'PDF'
      // For manual override, we assume the frontend already triggers PDF generation if needed, 
      // but Meta message sending handles text for now.
      
      try {
        const result = await sendWhatsAppMessage({
          toPhone: phoneToSend,
          customerName: customer.name,
          shareUrl,
          accessEnd: linkExpiresAt,
          mediaType: categoryMatch && categoryMatch.shareFormat === 'PDF' ? 'document' : 'text',
          mediaUrl: '' // PDF generation would be needed here for manual immediate send, left as text with url for now
        });

        await customer.save();

        return res.status(200).json({
          success: true,
          message: 'Message dispatched successfully via Meta API',
          scheduledJob: { status: 'Sent' }
        });
      } catch (sendErr) {
        if (categoryMatch) {
          categoryMatch.dispatchStatus = 'Failed';
        }
        await customer.save();

        return res.status(500).json({
          success: false,
          message: `Dispatch failed: ${sendErr.message}`,
          scheduledJob: { status: 'Failed' }
        });
      }
    }

    await customer.save();

    res.status(201).json({
      success: true,
      message: `Link sharing scheduled for ${formatDateTimeIST(scheduledDateTime)}`,
      scheduledJob: { status: 'Pending', scheduledDateTime }
    });
  } catch (error) {
    console.error('[scheduleCustomerShare Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule sharing', error: error.message });
  }
};

/**
 * @desc    Generate customer-specific PDF (filtering strictly by customer's assigned categories)
 * @route   POST /api/admin/customers/:id/pdf
 * @access  Private (Admin)
 */
export const generateCustomerPdf = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('assignedCategories');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const assignedCategoryNames = (customer.assignedCategories || [])
      .map((c) => (c && typeof c === 'object' && c.name ? c.name : c))
      .filter(Boolean);

    if (assignedCategoryNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This customer has no assigned categories. Please assign categories before generating catalog PDF.'
      });
    }

    // Extract allowed KTs across customer's categoryAccess
    let customerKts = [];
    if (Array.isArray(customer.categoryAccess)) {
      customer.categoryAccess.forEach((ca) => {
        if (Array.isArray(ca.kts)) customerKts.push(...ca.kts);
      });
    }
    customerKts = Array.from(new Set(customerKts));

    const { quality = 'original' } = req.body || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SG_Customer_Catalog_${Date.now()}.pdf"`);

    await generateStylesPdf({
      type: 'Customer',
      targetId: customer._id.toString(),
      targetName: `${customer.businessName || customer.name} Portfolio`,
      styleQuery: {
        categoryName: { $in: assignedCategoryNames }
      },
      allowedKts: customerKts,
      quality,
      res
    });
    // Stream completed, do not send JSON
  } catch (error) {
    console.error('[generateCustomerPdf Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
  }
};
