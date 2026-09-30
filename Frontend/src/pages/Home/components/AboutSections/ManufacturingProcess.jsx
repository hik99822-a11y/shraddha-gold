import React from 'react';
import { useLandingPage } from '../../../../context/LandingPageContext';
import { getImageUrl } from '../../../../utils/imageHelper';
import './AboutSections.css';

const ManufacturingProcess = () => {
  const { settings, loading } = useLandingPage();
  const steps = settings?.manufacturing?.steps;

  if (loading || !steps) return null;
  return (
    <section className="manufacturing-section premium-dark-section">
      <div className="manufacturing-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div className="manufacturing-header" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h5 style={{ color: '#5C9396', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '15px', fontWeight: '700' }}>The Art of Creation</h5>
          <h2 className="manufacturing-title" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#19241A', fontWeight: '600', margin: '0 0 20px 0' }}>
            MANUFACTURING PROCESS
          </h2>
          <p className="manufacturing-intro" style={{ fontSize: '1.2rem', color: '#4a554b', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
            A journey of transformation. From pure elemental gold to a breathtaking masterpiece, every phase is orchestrated with uncompromising precision and passion.
          </p>
        </div>

        <div className="process-timeline">
          {steps.map((step, index) => (
            <div className="premium-process-card" key={index}>
              <div className="process-card-image">
                <img src={getImageUrl(step.image) || 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=800&q=80'} alt={step.title} loading="lazy" />
                <div className="process-step-number">{String(index + 1).padStart(2, '0')}</div>
              </div>
              <div className="process-card-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ManufacturingProcess;
