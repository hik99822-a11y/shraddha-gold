import React from 'react';
import { Link } from 'react-router-dom';
import brandImg from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.25 PM (1).jpeg';

const BrandStorySplit = () => {
  return (
    <section className="brand-story-split bg-white">
      <div className="brand-story-container">
        <div 
          className="brand-story-image-col"
          style={{ backgroundImage: `url("${brandImg}")` }}
        >
        </div>
        <div className="brand-story-content-col">
          <h4 className="hero-subtitle font-sans" style={{ color: 'var(--brand-dark)', opacity: 1, transform: 'none' }}>Our Heritage</h4>
          <h2 className="section-title">A Legacy of<br/>Uncompromising Quality</h2>
          <p className="section-desc mb-4">
            For generations, Shraddha Gold has been synonymous with unparalleled craftsmanship and exquisite design. 
            Every piece is meticulously handcrafted by master artisans, blending traditional techniques with modern aesthetics.
          </p>
          <p className="section-desc mb-6">
            We source only the finest materials, ensuring that every creation not only captures the eye but stands the test of time as a treasured heirloom.
          </p>
          <Link to="/about" className="btn btn-outline-brand">
            Discover Our Story
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BrandStorySplit;
