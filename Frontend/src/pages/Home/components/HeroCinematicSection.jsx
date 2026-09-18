import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowDown, ShieldCheck, Gem } from 'lucide-react';

const HeroCinematicSection = () => {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });

  // Parallax transforms
  const yRing = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const scaleRing = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const opacityText = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const yText = useTransform(scrollYProgress, [0, 0.6], ['0%', '-15%']);

  const scrollToScene = (id) => {
    const el = document.getElementById(id);
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -40 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="scene-hero" ref={containerRef} className="hero-cinematic-scene">
      {/* Background Video with Cinematic Luxury Mask */}
      <div className="hero-video-backdrop">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/assets/images/hero-poster.webp"
          className="hero-ambient-video"
        >
          <source src="/videos/hero-jewellery.mp4" type="video/mp4" />
          <source src="/assets/videos/shraddha-gold-hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-vignette-overlay" />
        <div className="hero-gold-glow-radial" />
      </div>

      {/* Main Content Stage */}
      <div className="hero-stage-container">
        {/* Top Brand Monogram Tag */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="hero-top-badge"
        >
          <span className="hero-badge-pill">
            <Sparkles size={13} className="text-gold-light animate-pulse" />
            <span>EST. 1989 • PRIVATE B2B HIGH ATELIER</span>
          </span>
        </motion.div>

        {/* Central Narrative Anchor */}
        <motion.div
          style={{ opacity: opacityText, y: yText }}
          className="hero-narrative-block"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="hero-headline-serif"
          >
            SCULPTED BY TIME
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            className="hero-subtext"
          >
            Jewellery shaped by light, crafted for eternity. Where proprietary 22KT gold alloys meet master CAD engineering.
          </motion.p>
        </motion.div>

        {/* Central Masterpiece Floating Ring Display */}
        <motion.div
          style={{ y: yRing, scale: scaleRing }}
          className="hero-masterpiece-display"
        >
          <div className="hero-ring-halo" />
          <div className="hero-ring-frame">
            <img
              src="/assets/images/cinematic/eclipse-ring.jpg"
              alt="The Eclipse Solitaire Ring — 22KT Fine Gold & Solitaire Diamond"
              className="hero-ring-img"
              loading="eager"
            />
            <div className="hero-ring-specular-sheen" />
          </div>

          {/* Floating Luxury Annotation Badges */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="hero-spec-tag hero-spec-left"
          >
            <ShieldCheck size={14} className="text-gold-light" />
            <div>
              <strong>BIS 916 Hallmarked</strong>
              <span>Zero-Porosity Induction Cast</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="hero-spec-tag hero-spec-right"
          >
            <Gem size={14} className="text-gold-light" />
            <div>
              <strong>VVS1 Diamond Solitaire</strong>
              <span>Micro-Tension 6-Prong Crown</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="hero-cta-group"
        >
          <button
            type="button"
            onClick={() => scrollToScene('scene-celestial')}
            className="btn-luxury-gold"
          >
            <span>Explore Celestial Collection</span>
            <span className="btn-gold-glint" />
          </button>
          <button
            type="button"
            onClick={() => scrollToScene('scene-brand')}
            className="btn-luxury-outline"
          >
            <span>Our Atelier Story</span>
          </button>
        </motion.div>

        {/* Animated Scroll Down Indicator */}
        <button
          type="button"
          onClick={() => scrollToScene('scene-brand')}
          className="hero-scroll-indicator"
          aria-label="Scroll to discover brand heritage"
        >
          <span className="hero-scroll-label">SCROLL TO DISCOVER</span>
          <div className="hero-scroll-mouse">
            <div className="hero-scroll-dot" />
          </div>
          <ArrowDown size={14} className="hero-scroll-arrow" />
        </button>
      </div>
    </section>
  );
};

export default HeroCinematicSection;
