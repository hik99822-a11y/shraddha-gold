import React, { useState } from 'react';
import { inquiryApi } from '../../../services/api';
import { toast } from 'react-toastify';

const LeadFormSection = () => {
  const [formData, setFormData] = useState({ name: '', business: '', city: '', phone: '', email: '', interest: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await inquiryApi.submit({
        fullName: formData.name,
        companyName: formData.business,
        email: formData.email,
        phone: formData.phone,
        category: formData.interest,
        message: formData.message,
        subject: 'Catalog Request / Lead',
        estimatedVolume: formData.city // Just tracking city somewhere
      });

      toast.success("Thank you! The exclusive catalog has been sent to your email. Our executive will also contact you shortly.");
      setFormData({ name: '', business: '', city: '', phone: '', email: '', interest: '', message: '' });
      e.target.reset();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Error submitting the form. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { padding: '15px 20px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', backgroundColor: '#ffffff', color: '#19241A', fontSize: '1rem', outline: 'none', transition: 'border 0.3s' };

  return (
    <section className="premium-dark-section" style={{ backgroundColor: '#D6E6E7', padding: '100px 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="container" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center', padding: '0 20px' }}>
        <h5 style={{ color: '#5C9396', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '15px', fontWeight: '700' }}>Become a Partner</h5>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#19241A', fontWeight: '600', margin: '0 0 40px 0' }}>Request Exclusive Catalog</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <input type="text" name="name" placeholder="Your Name" required onChange={handleChange} style={inputStyle} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'}/>
            <input type="text" name="business" placeholder="Business Name" required onChange={handleChange} style={inputStyle} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <input type="text" name="city" placeholder="City" required onChange={handleChange} style={inputStyle} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'} />
            <input type="tel" name="phone" placeholder="Phone / WhatsApp" required onChange={handleChange} style={inputStyle} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'} />
          </div>
          <input type="email" name="email" placeholder="Email Address" required onChange={handleChange} style={inputStyle} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'} />
          <select name="interest" required onChange={handleChange} style={{...inputStyle, color: '#19241A', cursor: 'pointer'}} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'}>
            <option value="" style={{ color: '#000' }}>Select Interest</option>
            <option value="B2B Wholesale" style={{ color: '#000' }}>B2B Wholesale</option>
            <option value="Retail Purchase" style={{ color: '#000' }}>Retail Purchase</option>
            <option value="Custom Order" style={{ color: '#000' }}>Custom Order</option>
          </select>
          <textarea name="message" placeholder="Message" rows="4" onChange={handleChange} style={{...inputStyle, resize: 'vertical'}} onFocus={(e)=>e.target.style.borderColor='#5C9396'} onBlur={(e)=>e.target.style.borderColor='rgba(0,0,0,0.1)'}></textarea>
          <button type="submit" className="btn btn-brand" disabled={isSubmitting} style={{ padding: '18px', fontSize: '0.95rem', marginTop: '10px', width: '100%', letterSpacing: '2px', border: 'none', borderRadius: '4px', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'SENDING REQUEST...' : 'DOWNLOAD CATALOG'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default LeadFormSection;
