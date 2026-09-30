import React from 'react';
import { useLandingPage } from '../../../../context/LandingPageContext';
import { getImageUrl } from '../../../../utils/imageHelper';
import './AboutSections.css';

const PresenceShows = () => {
  const { settings, loading } = useLandingPage();
  const exhibitions = settings?.exhibitions;

  if (loading || !exhibitions) return null;
  return (
    <section className="premium-presence-section">
      <div className="premium-presence-container">
        
        <div className="premium-presence-content">
          <h3 className="premium-presence-subtitle">Global Exhibitions</h3>
          <h2 className="premium-presence-title">PRESENCE IN JEWELRY IIJS SHOWS</h2>
          
          <div className="presence-list" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {(exhibitions.events || []).map((event, index) => (
              <div className="premium-presence-item" key={index}>
                <div className="premium-presence-icon">
                  ★
                </div>
                <div className="premium-presence-item-content">
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                </div>
              </div>
            ))}
            
          </div>
        </div>
        
        <div className="premium-presence-gallery">
          {(exhibitions.images?.length > 0 ? exhibitions.images : [
            exhibitions.mainImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
            exhibitions.subImage || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80"
          ]).filter(img => img).map((img, idx) => (
            <img 
              key={idx}
              src={getImageUrl(img)} 
              alt={`Exhibition Event ${idx + 1}`} 
              className="premium-presence-gallery-img" 
              loading="lazy"
            />
          ))}
        </div>
        
      </div>
    </section>
  );
};

export default PresenceShows;
