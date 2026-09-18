import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import './JewelleryAtmosphere.css';

// Preset diamond & gold sparkle glint coordinates spread across visual depth
const INITIAL_SPARKLES = [
  { id: 'sp-1', top: '12%', left: '8%', size: 22, delay: 0.2, duration: 3.2, color: 'gold' },
  { id: 'sp-2', top: '18%', left: '88%', size: 28, delay: 1.4, duration: 4.1, color: 'diamond' },
  { id: 'sp-3', top: '28%', left: '4%', size: 18, delay: 2.1, duration: 3.8, color: 'gold' },
  { id: 'sp-4', top: '34%', left: '94%', size: 24, delay: 0.8, duration: 3.5, color: 'diamond' },
  { id: 'sp-5', top: '45%', left: '12%', size: 20, delay: 2.6, duration: 4.3, color: 'gold' },
  { id: 'sp-6', top: '52%', left: '85%', size: 26, delay: 1.1, duration: 3.9, color: 'diamond' },
  { id: 'sp-7', top: '65%', left: '6%', size: 22, delay: 1.9, duration: 4.0, color: 'gold' },
  { id: 'sp-8', top: '74%', left: '91%', size: 24, delay: 0.5, duration: 3.6, color: 'diamond' },
  { id: 'sp-9', top: '83%', left: '10%', size: 18, delay: 2.3, duration: 4.2, color: 'gold' },
  { id: 'sp-10', top: '92%', left: '87%', size: 26, delay: 1.7, duration: 3.7, color: 'diamond' }
];

// Delicate 24K gold leaf / vark flecks
const GOLD_LEAF_FLECKS = [
  { id: 'leaf-1', top: '15%', left: '14%', size: 14, rotate: 25, delay: 0 },
  { id: 'leaf-2', top: '24%', left: '82%', size: 18, rotate: -40, delay: 1.5 },
  { id: 'leaf-3', top: '42%', left: '7%', size: 12, rotate: 60, delay: 0.8 },
  { id: 'leaf-4', top: '58%', left: '90%', size: 16, rotate: -15, delay: 2.2 },
  { id: 'leaf-5', top: '72%', left: '16%', size: 20, rotate: 45, delay: 1.1 },
  { id: 'leaf-6', top: '88%', left: '80%', size: 14, rotate: -70, delay: 2.7 }
];

// Reusable 4-pointed jewellery sparkle SVG
const SparkleIcon = ({ size = 24, type = 'gold' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`jewellery-sparkle-svg sparkle-${type}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`goldGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--bg-light-brand)" />
        <stop offset="35%" stopColor="#d4af37" />
        <stop offset="70%" stopColor="#c2a052" />
        <stop offset="100%" stopColor="var(--brand-primary)" />
      </linearGradient>
      <linearGradient id={`diamondGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="var(--bg-light-brand)" />
        <stop offset="70%" stopColor="#d4af37" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <radialGradient id={`halo-${size}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(255, 245, 210, 0.9)" />
        <stop offset="60%" stopColor="rgba(212, 175, 55, 0.4)" />
        <stop offset="100%" stopColor="rgba(212, 175, 55, 0)" />
      </radialGradient>
    </defs>
    {/* Central optical glow halo */}
    <circle cx="12" cy="12" r="9" fill={`url(#halo-${size})`} />
    {/* 4-point diamond sparkle star */}
    <path
      d="M12 0C12 7.2 16.8 12 24 12C16.8 12 12 16.8 12 24C12 16.8 7.2 12 0 12C7.2 12 12 7.2 12 0Z"
      fill={type === 'gold' ? `url(#goldGrad-${size})` : `url(#diamondGrad-${size})`}
    />
    {/* Micro diagonal glint rays */}
    <path
      d="M12 5L13.5 10.5L19 12L13.5 13.5L12 19L10.5 13.5L5 12L10.5 10.5L12 5Z"
      fill="#ffffff"
      opacity="0.8"
    />
    {/* Core brilliant center */}
    <circle cx="12" cy="12" r="1.8" fill="#ffffff" />
  </svg>
);

const JewelleryAtmosphere = () => {
  const shouldReduceMotion = useReducedMotion();
  const [cursorGlint, setCursorGlint] = useState(null);
  const glintTimeoutRef = useRef(null);

  // Scroll parallax for gold leaf flecks
  const { scrollY } = useScroll();
  const leafY = useTransform(scrollY, [0, 3000], [0, -180]);

  // Handle subtle interactive sparkle on mouse move
  const handlePointerMove = useCallback((e) => {
    if (shouldReduceMotion || window.matchMedia('(pointer: coarse)').matches) return;

    // Throttle cursor glint updates to keep 60fps silky smooth
    if (!glintTimeoutRef.current) {
      glintTimeoutRef.current = setTimeout(() => {
        setCursorGlint({
          x: e.clientX,
          y: e.clientY,
          id: Date.now()
        });
        glintTimeoutRef.current = null;
      }, 180);
    }
  }, [shouldReduceMotion]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (glintTimeoutRef.current) clearTimeout(glintTimeoutRef.current);
    };
  }, [handlePointerMove]);

  return (
    <div className="jewellery-atmosphere-root" aria-hidden="true">
      {/* 1. Traditional Indian Royal Gold Filigree / Jali Motif Vector Watermark */}
      <div className="jewellery-jali-watermark-layer" />

      {/* 2. Warm Boutique Jewellery Showroom Lighting Vignettes */}
      <div className="jewellery-lighting-vignette vignette-top-left" />
      <div className="jewellery-lighting-vignette vignette-center-right" />
      <div className="jewellery-lighting-vignette vignette-bottom-left" />

      {/* 3. BIS Hallmark & 22K/18K Gold Karat Purity Watermark Stamps */}
      <div className="jewellery-hallmark-stamp stamp-top-right">
        <span className="hallmark-text-purity">916 • 22K</span>
        <span className="hallmark-text-sub">BIS CERTIFIED GOLD</span>
      </div>

      <div className="jewellery-hallmark-stamp stamp-mid-left">
        <span className="hallmark-text-purity">750 • 18K</span>
        <span className="hallmark-text-sub">HAUTE JOAILLERIE</span>
      </div>

      {/* 4. Ambient Twinkling Diamond & Gold Sparkle Glints */}
      {!shouldReduceMotion && (
        <div className="jewellery-sparkles-container">
          {INITIAL_SPARKLES.map((sp) => (
            <motion.div
              key={sp.id}
              className="jewellery-sparkle-item"
              style={{
                top: sp.top,
                left: sp.left,
                width: sp.size,
                height: sp.size
              }}
              animate={{
                opacity: [0, 0.9, 1, 0.2, 0],
                scale: [0.6, 1.2, 1, 0.8, 0.6],
                rotate: [0, 45, 90, 135, 180]
              }}
              transition={{
                duration: sp.duration,
                repeat: Infinity,
                delay: sp.delay,
                ease: 'easeInOut'
              }}
            >
              <SparkleIcon size={sp.size} type={sp.color} />
            </motion.div>
          ))}
        </div>
      )}

      {/* 5. Floating 24K Gold Leaf / Vark Organic Flecks */}
      {!shouldReduceMotion && (
        <motion.div
          className="jewellery-gold-leaf-container"
          style={{ y: leafY }}
        >
          {GOLD_LEAF_FLECKS.map((leaf) => (
            <motion.div
              key={leaf.id}
              className="gold-leaf-fleck"
              style={{
                top: leaf.top,
                left: leaf.left,
                width: leaf.size,
                height: leaf.size * 0.75
              }}
              animate={{
                y: [0, -18, 0],
                x: [0, 8, 0],
                rotate: [leaf.rotate, leaf.rotate + 18, leaf.rotate],
                opacity: [0.4, 0.75, 0.4]
              }}
              transition={{
                duration: 6.5,
                repeat: Infinity,
                delay: leaf.delay,
                ease: 'easeInOut'
              }}
            />
          ))}
        </motion.div>
      )}

      {/* 6. Transient Interactive Cursor Sparkle Glint */}
      {cursorGlint && !shouldReduceMotion && (
        <div
          key={cursorGlint.id}
          className="jewellery-cursor-glint"
          style={{
            left: cursorGlint.x,
            top: cursorGlint.y
          }}
        >
          <SparkleIcon size={20} type="diamond" />
        </div>
      )}
    </div>
  );
};

export default JewelleryAtmosphere;
