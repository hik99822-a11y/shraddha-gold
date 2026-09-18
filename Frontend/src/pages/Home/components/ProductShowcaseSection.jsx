import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShieldCheck, MessageSquare, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { productCategoriesData } from '../../../data/products';

// Interactive 3D Tilt Card with Moving Specular Sheen (AMIX Design style)
const ProductCard3D = ({ product, onOpenModal }) => {
  const cardRef = useRef(null);

  // Raw mouse coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Springs for fluid inertia response
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 });

  // 3D Rotations
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  // Specular Glare Coordinates
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current || window.matchMedia('(pointer: coarse)').matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / rect.width - 0.5;
    const yPct = mouseY / rect.height - 0.5;

    x.set(xPct);
    y.set(yPct);

    setGlarePos({
      x: (mouseX / rect.width) * 100,
      y: (mouseY / rect.height) * 100,
      opacity: 0.45
    });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      className="product-3d-tilt-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="product-showcase-card luxury-card"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        whileHover={{ scale3d: [1, 1.02, 1.02], transition: { duration: 0.25 } }}
        layout
      >
        {/* Dynamic Specular Golden Light Reflection Layer */}
        <div
          className="product-card-specular-glare"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(235, 205, 125, ${glarePos.opacity}) 0%, rgba(255, 255, 255, 0) 65%)`
          }}
          aria-hidden="true"
        />

        {/* Image Frame with 3D Depth */}
        <div className="product-card-image-wrap">
          <img
            src={product.image}
            alt={product.name}
            className="product-card-img"
            loading="lazy"
          />
          <div className="product-card-img-overlay" />

          {/* Purity Tag */}
          <div className="product-purity-badge">
            <ShieldCheck size={12} className="badge-shield" />
            <span>{product.purity}</span>
          </div>

          {/* Quick Action Overlay on Hover */}
          <div className="product-hover-actions">
            <button
              onClick={() => onOpenModal && onOpenModal(product)}
              className="product-quick-btn btn-brand"
              aria-label={`Inquire batch for ${product.name}`}
            >
              <MessageSquare size={14} />
              <span>Inquire Batch</span>
            </button>
          </div>
        </div>

        {/* Card Body Details */}
        <div className="product-card-body">
          <div className="product-meta-row">
            <span className="product-moq-tag">MOQ: {product.moq}</span>
          </div>

          <h3 className="product-card-name font-serif">{product.name}</h3>

          <p className="product-card-description">
            {product.description}
          </p>

          <div className="product-specs-box">
            <span className="specs-label">Specs:</span>
            <span className="specs-content">{product.specs}</span>
          </div>

          <div className="product-card-footer">
            <button
              onClick={() => onOpenModal && onOpenModal(product)}
              className="product-inquire-link"
            >
              <span>Request Quotation</span>
              <ArrowRight size={14} className="inquire-arrow" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ProductShowcaseSection = ({ onOpenModal }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCards, setVisibleCards] = useState(3);

  const categories = [
    { id: 'all', label: 'All Collections' },
    { id: 'gold-rings', label: 'Pendants & Suites' },
    { id: 'gold-chains', label: 'Fine Chains' },
    { id: 'gold-necklaces', label: 'Necklaces' },
    { id: 'gold-bangles', label: 'Bangles & Kada' },
    { id: 'gold-bracelets', label: 'Mens Bracelets' },
    { id: 'designer-jewellery', label: 'Luxury Timepieces' },
    { id: 'bridal-jewellery', label: 'Charm Suites' },
    { id: 'custom-jewellery', label: 'Custom OEM/ODM' }
  ];

  const filteredProducts = activeCategory === 'all'
    ? productCategoriesData
    : productCategoriesData.filter(p => p.id === activeCategory);

  // Responsive visible cards count based on viewport width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisibleCards(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCards(2);
      } else {
        setVisibleCards(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute maximum scrollable index
  const maxIndex = Math.max(0, filteredProducts.length - visibleCards);

  // Keep index within bounds if active category or screen size changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setCurrentIndex(0);
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToSlide = (index) => {
    setCurrentIndex(Math.min(Math.max(0, index), maxIndex));
  };

  // Autoplay functionality (advances every 4.5 seconds when not hovered)
  useEffect(() => {
    if (isPaused || maxIndex === 0) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, maxIndex, nextSlide]);

  // Touch gesture handling for smooth mobile swiping
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      nextSlide();
    } else if (distance < -45) {
      prevSlide();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  // Calculate slide width percentage
  const slideWidthPct = 100 / visibleCards;
  const isCenteredMode = filteredProducts.length < visibleCards;

  return (
    <section
      className="products-showcase-section section-padding bg-light-brand"
      id="products"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Our Products Showcase"
    >
      <div className="container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="luxury-badge">
            <span className="luxury-badge-dot" />
            <span>OUR PRODUCTS</span>
          </div>

          <h2 className="section-title">
            Fine Gold <span className="text-brand-accent">Manufacturing Portfolio</span>
          </h2>

          <p className="section-desc">
            Explore our precision-crafted fine gold collections. Every piece is engineered with 
            calibrated alloy density, zero porosity, and certified BIS hallmarking.
          </p>

          {/* Category Filter Navigation */}
          <div className="product-filter-pills" role="tablist">
            {categories.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`filter-pill-btn ${activeCategory === cat.id ? 'pill-active' : ''}`}
                onClick={() => handleCategoryChange(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Carousel Container */}
        <div
          className="products-carousel-container"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Floating Left Navigation Arrow */}
          {maxIndex > 0 && (
            <button
              type="button"
              onClick={prevSlide}
              className="products-carousel-nav-btn prev"
              aria-label="Previous product collection"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Carousel Viewport */}
          <div className="products-carousel-viewport">
            <motion.div
              className={`products-carousel-track ${isCenteredMode ? 'track-centered' : ''}`}
              animate={{
                x: isCenteredMode ? '0%' : `-${currentIndex * slideWidthPct}%`
              }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 28,
                mass: 0.8
              }}
            >
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="products-carousel-slide"
                  style={{
                    flex: isCenteredMode ? '0 0 auto' : `0 0 ${slideWidthPct}%`,
                    maxWidth: isCenteredMode ? '380px' : `${slideWidthPct}%`
                  }}
                >
                  <ProductCard3D
                    product={product}
                    onOpenModal={onOpenModal}
                  />
                </div>
              ))}
            </motion.div>
          </div>

          {/* Floating Right Navigation Arrow */}
          {maxIndex > 0 && (
            <button
              type="button"
              onClick={nextSlide}
              className="products-carousel-nav-btn next"
              aria-label="Next product collection"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Carousel Pagination & Indicator Bar */}
        {filteredProducts.length > 1 && (
          <div className="products-carousel-bottom-bar">
            {/* Status Counter Badge */}
            <div className="products-carousel-counter">
              <Sparkles size={14} className="counter-icon" />
              <span>
                Showing {currentIndex + 1}
                {visibleCards > 1 && filteredProducts.length > 1
                  ? `–${Math.min(currentIndex + visibleCards, filteredProducts.length)}`
                  : ''}{' '}
                of {filteredProducts.length} Collections
              </span>
            </div>

            {/* Pagination Dots */}
            {maxIndex > 0 && (
              <div className="products-carousel-pagination" role="tablist">
                {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                  <button
                    key={index}
                    role="tab"
                    aria-selected={currentIndex === index}
                    aria-label={`Go to slide ${index + 1}`}
                    className={`products-carousel-dot ${currentIndex === index ? 'active' : ''}`}
                    onClick={() => goToSlide(index)}
                  >
                    {currentIndex === index && (
                      <motion.span
                        layoutId="activeProductDot"
                        className="dot-glow"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductShowcaseSection;
