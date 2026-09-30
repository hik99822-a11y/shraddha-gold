import React from 'react';
import { useLandingPage } from '../../../../context/LandingPageContext';
import { getImageUrl } from '../../../../utils/imageHelper';
import './AboutSections.css';

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="company-star-icon">
    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="#125454"/>
  </svg>
);

const parseHighlightText = (text) => {
  if (!text) return null;
  
  // First, apply automatic highlighting for known phrases
  const autoHighlightPhrases = [
    "400+ Artisans, Designers, And Professionals",
    "18kt Gold",
    "22kt Craftsmanship",
    "Inspire, Innovate, And Illuminate The World Of Jewelry."
  ];

  let processedText = text;
  autoHighlightPhrases.forEach(phrase => {
    // Escape regex chars just in case, though these are safe
    const regex = new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    processedText = processedText.replace(regex, '*$1*');
  });

  const parts = processedText.split('*');
  return parts.map((part, index) => {
    if (index % 2 !== 0 && part.trim() !== '') {
      return <span key={index} className="highlight-text">{part}</span>;
    }
    return part;
  });
};

const CompanyOverview = () => {
  const { settings, loading } = useLandingPage();
  const overview = settings?.companyOverview;

  if (loading || !overview) return null;

  return (
    <section className="company-overview-section">
      <div className="overview-container">
        <div className="overview-content">
          <h2 className="overview-title">{overview.title || 'COMPANY OVERVIEW'}</h2>
          <div className="overview-text-block">
            {overview.description.split('\n\n').map((paragraph, index) => (
              <div key={index} className="overview-paragraph-wrapper">
                <StarIcon />
                <p className="overview-paragraph">{parseHighlightText(paragraph)}</p>
              </div>
            ))}
          </div>
          
          <div className="overview-pattern-bottom">
             {/* Decorative pattern shown in image */}
             <div className="pattern-row"></div>
             <div className="pattern-row"></div>
             <div className="pattern-row"></div>
          </div>
        </div>
        <div className="overview-image-wrapper">
          <img src={getImageUrl(overview.image) || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'} alt="Company Overview" className="overview-img" loading="lazy" />
        </div>
      </div>
    </section>
  );
};

export default CompanyOverview;
