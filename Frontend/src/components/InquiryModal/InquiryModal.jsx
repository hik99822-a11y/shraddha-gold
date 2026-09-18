import React, { useState } from 'react';
import { X, Send, Gem, CheckCircle2 } from 'lucide-react';
import { inquiryApi } from '../../services/api';
import './InquiryModal.css';

const InquiryModal = ({ isOpen, onClose, initialItem = null }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    subject: initialItem ? `Manufacturing Inquiry: ${initialItem.name || initialItem.title}` : 'B2B Manufacturing Inquiry',
    category: initialItem?.name || initialItem?.title || 'Custom Manufacturing',
    estimatedVolume: '10 - 50 Units',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await inquiryApi.submit(formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inquiry-modal-backdrop" onClick={onClose}>
      <div className="inquiry-modal-box luxury-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {success ? (
          <div className="modal-success-state">
            <div className="modal-success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="modal-success-title font-serif">Inquiry Transmitted</h3>
            <p className="modal-success-desc">
              Thank you for partnering with Shraddha Gold. Our chief metallurgical and production desk has received your specifications and will respond within 24 business hours.
            </p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div className="modal-badge luxury-badge">
                <Gem size={12} className="text-gold" />
                <span>B2B Manufacturing Proposal</span>
              </div>
              <h3 className="modal-title font-serif">
                Request Specifications &amp; OEM Quote
              </h3>
              {initialItem && (
                <p className="modal-reference-item">
                  Selected Category / Service: <strong>{initialItem.name || initialItem.title}</strong>
                </p>
              )}
            </div>

            {error && <div className="modal-error-alert">{error}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modal-name">Full Name *</label>
                  <input
                    id="modal-name"
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Anand Varma"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-company">Jewellery Brand / Company *</label>
                  <input
                    id="modal-company"
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Royal Jewels Pvt Ltd"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modal-email">Corporate Email *</label>
                  <input
                    id="modal-email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="partner@company.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-phone">Phone / WhatsApp *</label>
                  <input
                    id="modal-phone"
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98XXX XXXXX"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modal-category">Manufacturing Focus</label>
                  <input
                    id="modal-category"
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-volume">Estimated Production Volume</label>
                  <select
                    id="modal-volume"
                    name="estimatedVolume"
                    value={formData.estimatedVolume}
                    onChange={handleChange}
                  >
                    <option value="Sample / Prototype">Sample / Prototype Run</option>
                    <option value="10 - 50 Units">10 - 50 Units / Batch</option>
                    <option value="50 - 250 Units">50 - 250 Units / Month</option>
                    <option value="250 - 1000+ Units">250 - 1,000+ Units (Enterprise)</option>
                    <option value="Bullion Cast / Kilogram Order">Bullion Cast / Bulk Weight</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-message">Technical Specs / Metal Purity Requirements *</label>
                <textarea
                  id="modal-message"
                  name="message"
                  rows="3"
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Mention desired purity (18K/22K/24K), weight constraints, stone settings, or CAD design readiness..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-gold modal-submit-btn"
                >
                  <Send size={16} />
                  <span>{loading ? 'Transmitting Specifications...' : 'Submit Manufacturing Inquiry'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default InquiryModal;
