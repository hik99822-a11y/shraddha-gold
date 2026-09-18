import React from 'react';
import { Link } from 'react-router-dom';

const NewsletterCTA = () => {
  return (
    <section className="newsletter-cta-section section-padding bg-white">
      <div className="container text-center">
        <h2 className="section-title">Join the Inner Circle</h2>
        <p className="section-desc max-w-2xl mx-auto mb-6">
          Subscribe to our newsletter for exclusive access to new collections, behind-the-scenes insights, and special invitations to bespoke events.
        </p>
        
        <form className="newsletter-form max-w-md mx-auto flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="Enter your email address" 
            className="flex-1"
            required 
          />
          <button type="submit" className="btn btn-outline-brand newsletter-btn">Subscribe</button>
        </form>
      </div>
    </section>
  );
};

export default NewsletterCTA;
