import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Send, 
  CheckCircle2 
} from 'lucide-react';
import { contactData } from '../../../data/contact';
import { inquiryApi } from '../../../services/api';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    subject: 'B2B Manufacturing Inquiry via Landing Page',
    category: 'Custom OEM Production',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please provide a valid corporate email address.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 8) {
      setError('Please provide a brief message outlining your requirements.');
      return;
    }

    setLoading(true);

    try {
      await inquiryApi.submit(formData);
      setSuccess(true);
      setFormData({
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
        subject: 'B2B Manufacturing Inquiry via Landing Page',
        category: 'Custom OEM Production',
        message: ''
      });
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again or contact us directly via email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-preview-section section-padding bg-white" id="contact">
      <div className="container">
        <div className="contact-section-grid">
          {/* Left Column: Direct Commercial & Foundry Desk */}
          <div className="contact-desk-column">
            <div className="luxury-badge">
              <span className="luxury-badge-dot" />
              <span>GET IN TOUCH</span>
            </div>

            <h2 className="section-title text-left">
              Initiate B2B <span className="text-brand-accent">Collaboration</span>
            </h2>

            <p className="contact-desk-intro">
              Connect directly with Shraddha Gold’s production executives for OEM contracts, 
              sampling batches, CAD model evaluations, and wholesale fine gold manufacturing.
            </p>

            <div className="contact-desk-card-list">
              {/* Location */}
              <div className="desk-info-card luxury-card">
                <div className="desk-icon-box">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="desk-info-title">Manufacturing Works</h4>
                  <p className="desk-info-detail">{contactData.address.full}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="desk-info-card luxury-card">
                <div className="desk-icon-box">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="desk-info-title">Direct Telephone Desk</h4>
                  <p className="desk-info-detail">
                    <a href={contactData.phones[0].href} className="contact-phone-link">
                      {contactData.phones[0].number} (Foundry Desk)
                    </a>
                    <br />
                    <a href={contactData.phones[1].href} className="contact-phone-link">
                      {contactData.phones[1].number} (Board Line)
                    </a>
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="desk-info-card luxury-card">
                <div className="desk-icon-box">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="desk-info-title">Procurement &amp; Inquiries</h4>
                  <p className="desk-info-detail">
                    <a href={contactData.emails[0].href} className="contact-email-link">
                      {contactData.emails[0].email}
                    </a>
                    <br />
                    <a href={contactData.emails[1].href} className="contact-email-link">
                      {contactData.emails[1].email}
                    </a>
                  </p>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="desk-info-card luxury-card">
                <div className="desk-icon-box">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="desk-info-title">Operating Hours</h4>
                  <p className="desk-info-detail">
                    {contactData.hours.weekdays}<br />
                    {contactData.hours.sunday}
                  </p>
                </div>
              </div>
            </div>

            {/* Confidentiality Guarantee */}
            <div className="desk-confidentiality-banner glass-panel">
              <ShieldCheck size={26} className="shield-icon" />
              <div>
                <h5 className="confidentiality-title">Strict NDA Protection</h5>
                <p className="confidentiality-desc">
                  All blueprints, CAD models, and customer specifications remain strictly confidential under legal non-disclosure.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: RFQ Inquiry Form */}
          <div className="contact-form-column">
            <div className="contact-form-wrapper luxury-card">
              <h3 className="form-title font-serif">Request a Manufacturing Quotation (RFQ)</h3>
              <p className="form-subtitle">
                Fill in the details below to receive a custom metallurgical quote and production timeline.
              </p>

              {error && <div className="form-error-box">{error}</div>}

              {success ? (
                <div className="form-success-state">
                  <div className="success-icon-wrap">
                    <CheckCircle2 size={48} className="success-svg" />
                  </div>
                  <h4 className="success-heading font-serif">Inquiry Transmitted Successfully</h4>
                  <p className="success-text">
                    Thank you for reaching out to Shraddha Gold. Our production engineering director will review your specifications and contact you within 24 business hours.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="btn btn-outline-brand mt-4"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rfq-inquiry-form">
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label htmlFor="fullName">Full Name *</label>
                      <input
                        id="fullName"
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Rajesh Mehta"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="companyName">Company / Brand Name</label>
                      <input
                        id="companyName"
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="e.g. Mehta Fine Jewels"
                      />
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label htmlFor="email">Email Address *</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="e.g. rajesh@jewels.com"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">Phone / Mobile *</label>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g. +91 98200 00000"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Inquiry Category</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      <option value="Custom OEM Production">Custom OEM Production</option>
                      <option value="Wholesale Gold Jewellery">Wholesale Gold Jewellery</option>
                      <option value="Induction Vacuum Casting">Induction Vacuum Casting Service</option>
                      <option value="CAD Prototyping">CAD Design &amp; 3D Prototyping</option>
                      <option value="Bridal Collection Program">Bridal Collection Program</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Manufacturing Requirements *</label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Specify karatage (18K/22K), approximate volume, weight range, or special casting requests..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-brand w-full form-submit-btn"
                  >
                    {loading ? (
                      <span>Transmitting Specifications...</span>
                    ) : (
                      <>
                        <span>Get In Touch / Submit RFQ</span>
                        <Send size={15} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
