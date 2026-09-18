import React, { useState, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import './ProductCard.css';

const ProductCard = ({ category, onExplore }) => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x: x * 14, y: y * 14 });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className="product-category-card luxury-card"
      onClick={() => onExplore && onExplore(category)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
    >
      <div className="product-card-image-wrapper">
        <img
          src={category.image}
          alt={category.name}
          className="product-card-image"
          style={{
            transform: !shouldReduceMotion && isHovered
              ? `scale(1.08) translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`
              : 'scale(1) translate3d(0, 0, 0)',
            transition: isHovered ? 'transform 0.12s ease-out' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          loading="lazy"
        />
        <div className="product-card-overlay" />
        <span className="product-purity-tag">{category.purity}</span>
      </div>

      {/* Card content remains completely stable */}
      <div className="product-card-body">
        <h3 className="product-category-title font-serif">{category.name}</h3>
        <p className="product-category-desc">{category.description}</p>
        
        <div className="product-card-meta">
          <span className="product-moq-label">MOQ: {category.moq}</span>
          <button
            type="button"
            className="explore-category-btn"
            aria-label={`Explore ${category.name}`}
          >
            <span>Explore</span>
            <ArrowUpRight size={16} className="explore-arrow" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
