import React from 'react';

const SectionTitle = ({
  badge = '',
  title = '',
  highlight = '',
  description = '',
  align = 'center',
  className = ''
}) => {
  return (
    <div className={`section-header ${align === 'left' ? 'text-left' : ''} ${className}`}>
      {badge && (
        <div className="luxury-badge">
          <span className="luxury-badge-dot" />
          <span>{badge}</span>
        </div>
      )}
      
      {title && (
        <h2 className="section-title">
          {title}{' '}
          {highlight && <span className="text-gold-gradient">{highlight}</span>}
        </h2>
      )}

      {description && (
        <p className="section-desc">{description}</p>
      )}
    </div>
  );
};

export default SectionTitle;
