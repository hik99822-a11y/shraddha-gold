import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { inquiryApi } from '../../services/api';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    subject: '',
    category: 'Turnkey Manufacturing',
    estimatedVolume: '50 - 250 Units',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePhone = (phone) => {
    return /^[+]?[0-9\s\-]{8,16}$/.test(phone.trim());
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please provide a valid corporate email address.');
      return;
    }
    if (!validatePhone(formData.phone)) {
      setError('Please enter a valid telephone or mobile number.');
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setError('Please provide at least 10 characters detailing your manufacturing requirements.');
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
        subject: '',
        category: 'Turnkey Manufacturing',
        estimatedVolume: '50 - 250 Units',
        message: ''
      });
    } catch (err) {
      setError(err.message || 'Transmission failed. Please verify connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-root">
      {/* Premium Minimalist Banner */}
      <section className="contact-banner bg-light-brand">
        <div className="container text-center py-16">
          <div className="luxury-badge-small mx-auto mb-4">
            <Mail size={14} className="text-brand-primary" />
            <span className="text-brand-dark">Commercial Headquarters</span>
          </div>
          <h1 className="contact-banner-title font-serif text-brand-dark">
            Initiate B2B Collaboration
          </h1>
          <p className="contact-banner-desc text-secondary max-w-2xl mx-auto">
            Connect directly with Shraddha Gold's production executives for OEM contracts, 
            sampling programs, CAD model evaluations, and wholesale inquiries.
          </p>
        </div>
      </section>

      {/* Main Split Layout */}
      <section className="contact-main-section py-16">
        <div className="container">
          <div className="contact-grid">
            
            {/* Left Column: Contact Details */}
            <div className="contact-details-col">
              <h3 className="font-serif text-2xl text-brand-dark mb-6">Contact Center</h3>
              <p className="text-secondary mb-10 leading-relaxed">
                Our manufacturing team welcomes scheduled technical consultations, confidential RFQ briefs, 
                and official foundry visits. We guarantee absolute privacy for all your proprietary designs.
              </p>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-icon-wrapper">
                    <MapPin size={20} className="text-brand-primary" />
                  </div>
                  <div className="contact-info-content">
                    <h5 className="font-bold text-brand-dark">Manufacturing Works</h5>
                    <p className="text-secondary text-sm mt-1">
                      Plot 42, SEZ Jewellery Manufacturing Zone,<br />
                      Andheri East, Mumbai — 400096, India
                    </p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-icon-wrapper">
                    <Mail size={20} className="text-brand-primary" />
                  </div>
                  <div className="contact-info-content">
                    <h5 className="font-bold text-brand-dark">Procurement &amp; Inquiries</h5>
                    <p className="text-secondary text-sm mt-1">
                      <a href="mailto:info@shraddhagold.com" className="hover-brand-text">info@shraddhagold.com</a><br />
                      <a href="mailto:orders@shraddhagold.com" className="hover-brand-text">orders@shraddhagold.com</a>
                    </p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-icon-wrapper">
                    <Phone size={20} className="text-brand-primary" />
                  </div>
                  <div className="contact-info-content">
                    <h5 className="font-bold text-brand-dark">Direct Telephone Desk</h5>
                    <p className="text-secondary text-sm mt-1">
                      <a href="tel:+919825012345" className="hover-brand-text">+91 98250 12345 (Foundry Desk)</a><br />
                      <a href="tel:+912267890123" className="hover-brand-text">+91 22 6789 0123 (Board Line)</a>
                    </p>
                  </div>
                </div>
                
                <div className="contact-info-item">
                  <div className="contact-icon-wrapper">
                    <Clock size={20} className="text-brand-primary" />
                  </div>
                  <div className="contact-info-content">
                    <h5 className="font-bold text-brand-dark">Operating Timings</h5>
                    <p className="text-secondary text-sm mt-1">
                      Monday to Saturday: 09:30 AM — 07:00 PM IST<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>

              <div className="security-assurance-card mt-10">
                <ShieldCheck size={24} className="text-brand-primary flex-shrink-0" />
                <div>
                  <h6 className="font-bold text-brand-dark text-sm">Strict Confidentiality Guarantee</h6>
                  <p className="text-secondary text-xs mt-1 leading-relaxed">
                    All submitted blueprints, CAD geometry, and commercial inquiries are protected under our standard non-disclosure agreement.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Inquiry Form */}
            <div className="contact-form-col">
              <div className="contact-form-wrapper bg-white">
                <h3 className="font-serif text-2xl text-brand-dark mb-2">Formal Inquiry (RFQ)</h3>
                <p className="text-secondary text-sm mb-8">
                  Please complete the form below to receive a customized production timeline and metallurgical estimate.
                </p>

                {error && <div className="form-error-alert">{error}</div>}

                {success ? (
                  <div className="form-success-state">
                    <CheckCircle2 size={48} className="text-brand-primary mx-auto mb-4" />
                    <h4 className="font-serif text-xl text-brand-dark mb-2">Inquiry Transmitted</h4>
                    <p className="text-secondary text-sm mb-6">
                      Thank you for choosing Shraddha Gold. Our production engineering director will review your specifications and contact you within 24 business hours.
                    </p>
                    <button className="btn btn-outline-brand w-full" onClick={() => setSuccess(false)}>
                      Submit Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="rfq-form">
                    <div className="form-grid-2">
                      <div className="input-group">
                        <label>Full Name *</label>
                        <input
                          name="fullName"
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="e.g. Anand Shah"
                          className="luxury-input"
                        />
                      </div>
                      <div className="input-group">
                        <label>Company / Brand *</label>
                        <input
                          name="companyName"
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={handleChange}
                          placeholder="e.g. Royal Gems"
                          className="luxury-input"
                        />
                      </div>
                    </div>

                    <div className="form-grid-2 mt-5">
                      <div className="input-group">
                        <label>Email Address *</label>
                        <input
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="partner@brand.com"
                          className="luxury-input"
                        />
                      </div>
                      <div className="input-group">
                        <label>Phone / WhatsApp *</label>
                        <input
                          name="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 98XXX XXXXX"
                          className="luxury-input"
                        />
                      </div>
                    </div>

                    <div className="form-grid-2 mt-5">
                      <div className="input-group">
                        <label>Subject *</label>
                        <input
                          name="subject"
                          type="text"
                          required
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="Contract Inquiry"
                          className="luxury-input"
                        />
                      </div>
                      <div className="input-group">
                        <label>Category Focus</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="luxury-input"
                        >
                          <option value="Turnkey Manufacturing">Turnkey Manufacturing</option>
                          <option value="CAD / CAM & 3D Prototyping">CAD / CAM &amp; 3D Prototyping</option>
                          <option value="Vacuum Induction Casting">Vacuum Induction Casting</option>
                          <option value="Bridal Collection OEM">Bridal Collection OEM</option>
                          <option value="Gold Chains & Bangles Batch">Gold Chains &amp; Bangles Batch</option>
                        </select>
                      </div>
                    </div>

                    <div className="input-group mt-5">
                      <label>Project Requirements &amp; Specifications *</label>
                      <textarea
                        name="message"
                        rows="4"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Detail your desired karatage, estimated volume, or specific questions..."
                        className="luxury-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-brand w-full mt-6 flex justify-center items-center gap-2"
                    >
                      <Send size={16} />
                      <span>{loading ? 'Submitting...' : 'Send Inquiry'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
