import Inquiry from '../models/Inquiry.js';
import sendEmail from '../utils/sendEmail.js';

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

    // Send email notification via SMTP
    const emailHtml = `
      <h2>New Website Submission: ${newInquiry.subject}</h2>
      <p><strong>Name:</strong> ${newInquiry.fullName}</p>
      <p><strong>Email:</strong> ${newInquiry.email}</p>
      <p><strong>Phone:</strong> ${newInquiry.phone}</p>
      <p><strong>Company:</strong> ${newInquiry.companyName}</p>
      <p><strong>Category/Interest:</strong> ${newInquiry.category}</p>
      <br />
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px;">${newInquiry.message}</p>
    `;

    // Only send if SMTP credentials are provided, avoids breaking local dev
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Send to the specified admin email
      const notifyEmail = 'hik99822@gmail.com'; 
      await sendEmail({
        to: notifyEmail,
        subject: `New Lead/Subscriber: ${newInquiry.fullName}`,
        html: emailHtml
      });
    }

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
