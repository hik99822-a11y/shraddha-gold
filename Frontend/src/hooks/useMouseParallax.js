import { useState, useEffect } from 'react';

/**
 * useMouseParallax
 * Tracks mouse position normalized from -1 (left/top) to +1 (right/bottom)
 * centered at the viewport middle.
 * 
 * Safety & Accessibility:
 * - Automatically disables on touch devices (pointer: coarse).
 * - Automatically disables when user has enabled prefers-reduced-motion.
 * 
 * @param {Object} options
 * @param {number} [options.multiplier=1] Sensitivity multiplier
 * @param {boolean} [options.enabled=true] Manual override toggle
 * @returns {{ x: number, y: number, isSupported: boolean }}
 */
export const useMouseParallax = ({ multiplier = 1, enabled = true } = {}) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check for reduced motion or non-fine pointer (mobile/touch)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (prefersReducedMotion || !hasFinePointer || !enabled) {
      setIsSupported(false);
      setCoords({ x: 0, y: 0 });
      return;
    }

    setIsSupported(true);

    let animationFrameId = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e) => {
      // Calculate normalized mouse coordinate relative to window center: [-1, 1]
      const halfWidth = window.innerWidth / 2;
      const halfHeight = window.innerHeight / 2;
      targetX = ((e.clientX - halfWidth) / halfWidth) * multiplier;
      targetY = ((e.clientY - halfHeight) / halfHeight) * multiplier;
    };

    // Smooth lerp rendering loop to avoid jitter and ensure 60fps GPU smoothness
    const updateMotion = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      setCoords({
        x: Math.round(currentX * 1000) / 1000,
        y: Math.round(currentY * 1000) / 1000
      });

      animationFrameId = requestAnimationFrame(updateMotion);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animationFrameId = requestAnimationFrame(updateMotion);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [multiplier, enabled]);

  return { ...coords, isSupported };
};

export default useMouseParallax;
