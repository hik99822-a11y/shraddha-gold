import React, { useState } from 'react';
import { inquiryApi } from '../../../services/api';
import { toast } from 'react-toastify';

const NewsletterCTA = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await inquiryApi.submit({
        fullName: 'Newsletter Subscriber',
        email: email,
        phone: 'N/A', // Backend requires phone
        message: 'New subscription request via footer/newsletter CTA.',
        subject: 'Newsletter Subscription',
        category: 'Subscription'
      });

      toast.success("Thank you for subscribing to our newsletter! You're now on the list.");
      setEmail("");
      e.target.reset();
    } catch (error) {
      console.error("Newsletter submission error:", error);
      toast.error("Error submitting the form. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="premium-newsletter-section">
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h5 style={{ color: '#ffffff', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '15px' }}>Exclusive Access</h5>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#ffffff', fontWeight: '400', margin: '0 0 20px 0' }}>Join the Inner Circle</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Subscribe to our exclusive newsletter for early access to magnificent new collections, behind-the-scenes artistry insights, and special invitations to bespoke events.
        </p>
        
        <form className="premium-newsletter-form" onSubmit={handleSubmit}>
          <input 
            type="email" 
            name="email"
            placeholder="Enter your email address..." 
            className="premium-newsletter-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <button type="submit" className="premium-newsletter-btn" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default NewsletterCTA;
