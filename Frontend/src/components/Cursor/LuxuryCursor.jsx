import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const LuxuryCursor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);

  const dotConfig = { damping: 40, stiffness: 700, mass: 0.1 };
  const dotX = useSpring(0, dotConfig);
  const dotY = useSpring(0, dotConfig);

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseMove = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleElementHover = (e) => {
      const target = e.target;
      const isInteractive = target.closest('a, button, [role="button"], .luxury-card, .filter-pill-btn, .carousel-nav-arrow, input, select, textarea');
      setIsHovered(!!isInteractive);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleElementHover, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleElementHover);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY, dotX, dotY, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="luxury-cursor-root" aria-hidden="true">
      {/* Outer Spring Ring */}
      <motion.div
        className={`luxury-cursor-ring ${isHovered ? 'cursor-ring-hovered' : ''}`}
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%'
        }}
      />

      {/* Center Precise Dot */}
      <motion.div
        className="luxury-cursor-dot"
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%'
        }}
      />
    </div>
  );
};

export default LuxuryCursor;
