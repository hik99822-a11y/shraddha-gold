import React from 'react';
import { useLandingPage } from '../../../../context/LandingPageContext';
import './AboutSections.css';

const UniqueSellingPropositions = () => {
  const { settings, loading } = useLandingPage();
  const usps = settings?.usps?.items;

  if (loading || !usps) return null;
  
  const uploadedImages = usps.filter(u => u.image);
  const col1Images = uploadedImages.filter((_, i) => i % 2 === 0);
  const col2Images = uploadedImages.filter((_, i) => i % 2 !== 0);

  return (
    <section className="usps-section">
      <div className="usps-header">
        <h2 className="usps-title">UNIQUE SELLING PROPOSITIONS</h2>
        <p className="usps-intro">We Craft Stories That Blend Tradition, Elegance, And Innovation. Our Designs Reflect A Perfect Harmony Of Heritage And Modern Artistry, Ensuring That Every Piece Is A Treasure For Generations To Cherish. With A Commitment To Quality, Variety, And Timeless Style, Shraddha Gold Stands Apart As A Brand That Brings Your Jewelry Dreams To Life.</p>
      </div>
      
      <div className="usps-layout">
        <div className="usps-list-container">
          <div className="usps-scrollable-list">
            {usps.map((usp, index) => (
              <div className="usp-item" key={index}>
                <div className="usp-marker">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#5C9396"/>
                  </svg>
                </div>
                <div className="usp-text-content">
                  <h4 className="usp-item-title">{usp.title}:</h4>
                  <p className="usp-item-desc">{usp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="usps-images-masonry">
           <div className="masonry-col masonry-col-1">
             {col1Images.map((usp, index) => (
               <img key={index} src={usp.image} alt={usp.title} className="masonry-img" loading="lazy" />
             ))}
           </div>
           <div className="masonry-col masonry-col-2">
             {col2Images.map((usp, index) => (
               <img key={index} src={usp.image} alt={usp.title} className="masonry-img" loading="lazy" />
             ))}
           </div>
        </div>
      </div>
    </section>
  );
};

export default UniqueSellingPropositions;
