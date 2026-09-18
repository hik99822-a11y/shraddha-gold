import Inquiry from '../models/Inquiry.js';

/**
 * @desc    Submit a B2B jewellery manufacturing inquiry
 * @route   POST /api/inquiries
 * @access  Public
 */
export const createInquiry = async (req, res) => {
  try {
    const { fullName, companyName, email, phone, subject, category, estimatedVolume, message } = req.body;

    if (!fullName || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, phone number, and project message.'
      });
    }

    const newInquiry = await Inquiry.create({
      fullName,
      companyName: companyName || 'Private Retailer / Brand',
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      subject: subject || 'Custom Gold Jewellery Manufacturing Inquiry',
      category: category || 'Custom Manufacturing',
      estimatedVolume: estimatedVolume || 'Sample / Prototype',
      message
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry received successfully. A Shraddha Gold B2B representative will review your specifications and contact you shortly.',
      inquiryId: newInquiry._id
    });
  } catch (error) {
    console.error('[Create Inquiry Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit manufacturing inquiry'
    });
  }
};

/**
 * @desc    Get all inquiries (for B2B admin/partner dashboard)
 * @route   GET /api/inquiries
 * @access  Private
 */
export const getInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries
    });
  } catch (error) {
    console.error('[Get Inquiries Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inquiries'
    });
  }
};
