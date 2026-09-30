import React from 'react';
import { useLandingPage } from '../../../../context/LandingPageContext';
import './AboutSections.css';

const defaultStrengths = [
  { title: "8 Years of Excellence", description: "Shraddha Gold has been crafting timeless jewelry with passion, precision, and dedication for over 8 years." },
  { title: "A Humble Beginning", description: "Our journey began in a 1,200 sq.ft. space, powered by the dreams and determination of just 10 people who believed in creating something extraordinary." },
  { title: "A World of Creativity", description: "Today, Shraddha Gold has grown into a 60,000 sq.ft. creative hub, powered by the skill, talent, and teamwork of 400+ artisans who breathe life into every design." }
];

const OurStrength = () => {
  const { settings, loading } = useLandingPage();

  const title = settings?.strengths?.title || "OUR STRENGTH";
  const subtitle = settings?.strengths?.subtitle || "Why Choose Us";
  const items = settings?.strengths?.items?.length > 0 ? settings.strengths.items : defaultStrengths;

  if (loading) return null;
  return (
    <section className="premium-strength-section">
      <div style={{ textAlign: 'center', marginBottom: '80px', padding: '0 20px' }}>
        <h5 style={{ color: '#B1D1CB', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '15px', fontWeight: '700' }}>{subtitle}</h5>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#FFFFFF', fontWeight: '600', margin: '0' }}>
          {title}
        </h2>
      </div>
      
      <div className="strength-grid">
        {items.map((item, index) => (
          <div key={index} className="premium-strength-card">
            <h3 className="premium-strength-title">
              <span className="premium-strength-icon" style={{marginRight: '8px'}}>✦</span>
              {item.title}:
            </h3>
            <p className="premium-strength-desc">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default OurStrength;
