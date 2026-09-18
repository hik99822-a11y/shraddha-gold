import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const heroSlides = [
  {
    id: 'slide-1',
    src: '/assets/images/hero/premium-gold-collection.webp',
    alt: 'Shraddha Gold — Fine Rose Gold & Diamond Teardrop Masterpiece',
    title: 'Pure Gold Masterpieces'
  },
  {
    id: 'slide-2',
    src: '/assets/images/hero/authentic-pendant-suites.webp',
    alt: 'Shraddha Gold — Authentic Fine Pendants, Chains & Necklaces',
    title: 'Authentic Fine Suites'
  },
  {
    id: 'slide-3',
    src: '/assets/images/hero/gents-collection.webp',
    alt: 'Shraddha Gold — 22K Precision Cast Mens Bracelets & Diamond Kada',
    title: 'Precision Castings'
  },
  {
    id: 'slide-4',
    src: '/assets/images/hero/authentic-timepieces-bangles.webp',
    alt: 'Shraddha Gold — Luxury Timepieces & Diamond Kadas',
    title: 'Luxury Timepieces & Bangles'
  },
  {
    id: 'slide-5',
    src: '/assets/images/hero/designer-collection.webp',
    alt: 'Shraddha Gold — Designer Haute Joaillerie Diamond Timepieces',
    title: 'Designer Collections'
  },
  {
    id: 'slide-6',
    src: '/assets/images/hero/ladies-collection.webp',
    alt: 'Shraddha Gold — Gemstone Station Bracelets & Layered Chains',
    title: 'Gemstone & Trousseau Suites'
  }
];

const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const heroRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Scroll parallax binding for Hero
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  // Advance to next slide
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroSlides.length);
  }, []);

  // Return to previous slide
  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  // Auto-advance carousel timer (5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4800);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleScrollToMilestones = (e) => {
    e.preventDefault();
    const el = document.getElementById('milestones');
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -80 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      window.history.pushState(null, '', '#milestones');
    }
  };

  return (
    <section
      className="hero-carousel-root"
      id="hero"
      ref={heroRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero Jewellery Showcase Carousel"
    >
      {/* Parallax wrapper containing the slides */}
      <motion.div
        className="hero-carousel-track"
        style={{ y: shouldReduceMotion ? 0 : heroY }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={heroSlides[currentIndex].id}
            className="hero-carousel-slide"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={heroSlides[currentIndex].src}
              alt={heroSlides[currentIndex].alt}
              className="hero-slide-image"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Subtle top & bottom edge shadows for smooth header/footer framing without washing out images */}
      <div className="hero-edge-framing-top" />
      <div className="hero-edge-framing-bottom" />

      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={prevSlide}
        className="carousel-nav-arrow arrow-left"
        aria-label="Previous jewellery slide"
      >
        <ChevronLeft size={28} />
      </button>

      {/* Right Navigation Arrow */}
      <button
        type="button"
        onClick={nextSlide}
        className="carousel-nav-arrow arrow-right"
        aria-label="Next jewellery slide"
      >
        <ChevronRight size={28} />
      </button>


      {/* Bottom Pagination Dots */}
      <div className="carousel-pagination-dots" role="tablist">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.id}
            role="tab"
            aria-selected={currentIndex === index}
            aria-label={`Go to slide ${index + 1}`}
            className={`carousel-dot ${currentIndex === index ? 'dot-active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          >
            {currentIndex === index && (
              <motion.span
                layoutId="activeDotIndicator"
                className="dot-fill"
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Subtle Scroll Down Prompt */}
      <motion.div
        className="hero-down-scroll"
        style={{ opacity: indicatorOpacity }}
      >
        <a
          href="#milestones"
          onClick={handleScrollToMilestones}
          className="down-scroll-link"
          aria-label="Scroll to Milestones"
        >
          <span className="down-scroll-text">Explore</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          >
            <ChevronDown size={18} className="down-scroll-icon" />
          </motion.div>
        </a>
      </motion.div>
    </section>
  );
};

export default HeroSection;
