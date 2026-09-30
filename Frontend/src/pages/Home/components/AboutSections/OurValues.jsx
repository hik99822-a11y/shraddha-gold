import React from 'react';
import { useLandingPage } from '../../../../context/LandingPageContext';
import './AboutSections.css';

const OurValues = () => {
  const { settings, loading } = useLandingPage();
  const values = settings?.ourValues;

  if (loading || !values) return null;
  return (
    <section className="our-values-section">
      <div className="values-container">
        
        <div className="values-left-column">
          <div className="values-sticky-content">
            <div className="target-decorative-icon">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#B1D1CB" strokeWidth="1"/>
                <circle cx="12" cy="12" r="6" stroke="#B1D1CB" strokeWidth="1"/>
                <circle cx="12" cy="12" r="2" fill="#5C9396"/>
                <path d="M12 12L24 12" stroke="#5C9396" strokeWidth="1"/>
              </svg>
            </div>
            <h2 className="values-main-title">OUR<br/>VALUES</h2>
            <p className="values-intro">The guiding principles that shape every masterpiece we create at Shraddha Gold.</p>
          </div>
        </div>
        
        <div className="values-right-column">
          {(values.items && values.items.length > 0 ? values.items : [
            // Fallback for old schema
            { number: "01", title: "VISION", subtitle: "TRUST | INNOVATE | INSPIRE | IMPACT.", description: values.vision || "" },
            { number: "02", title: "MISSION", subtitle: "EMPOWER | EVOLVE | SUCCEED.", description: values.mission || "" },
            { number: "03", title: "GOAL", subtitle: "DELIVER | DEVELOP | DELIGHT", description: values.goal || "" },
            { number: "04", title: "CORE VALUE", subtitle: "TRANSPARENCY | FAIRNESS | CRAFTSMANSHIP", description: values.coreValue || "" }
          ]).map((item, index) => (
            <div key={index} className="value-list-item">
              <div className="value-number">{item.number}</div>
              <div className="value-list-content">
                <h3 className="value-title">{item.title}</h3>
                <h4 className="value-subtitle">{item.subtitle}</h4>
                <p className="value-desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurValues;
