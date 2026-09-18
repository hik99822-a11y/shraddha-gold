import React from 'react';
import { Link } from 'react-router-dom';
import imgCampaign from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.25 PM (1).jpeg';

const CampaignBanner = () => {
  return (
    <section className="campaign-banner-split">
      <div className="campaign-container">
        
        {/* Left: Image Side */}
        <div 
          className="campaign-image-col"
          style={{ backgroundImage: `url("${imgCampaign}")` }}
        >
        </div>

        {/* Right: Content Block (Pista Green) */}
        <div className="campaign-content-col bg-brand-primary">
          <h4 className="campaign-subtitle text-brand-dark">The Ultimate Gift</h4>
          <h2 className="campaign-title text-brand-dark">Shine Bright<br/>This Season</h2>
          <p className="campaign-desc text-brand-dark">
            Discover our curated selection of timeless jewelry, crafted to elevate your every day.
          </p>
          <Link to="/products" className="btn btn-outline-brand campaign-btn">
            Explore Gifts
          </Link>
        </div>

      </div>
    </section>
  );
};

export default CampaignBanner;
