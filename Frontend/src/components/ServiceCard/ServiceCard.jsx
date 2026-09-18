import React from 'react';
import * as Icons from 'lucide-react';
import './ServiceCard.css';

const ServiceCard = ({ service, onSelect }) => {
  const IconComponent = Icons[service.iconName] || Icons.Sparkles;

  return (
    <div className="service-card luxury-card" onClick={() => onSelect && onSelect(service)}>
      <div className="service-card-glow" />
      <div className="service-icon-wrapper">
        <IconComponent size={26} className="service-icon" />
      </div>
      <span className="service-subtitle">{service.subtitle}</span>
      <h3 className="service-title">{service.title}</h3>
      <p className="service-desc">{service.description}</p>
      
      <div className="service-card-footer">
        <span className="service-action-link">
          Explore Specifications &rarr;
        </span>
      </div>
    </div>
  );
};

export default ServiceCard;
