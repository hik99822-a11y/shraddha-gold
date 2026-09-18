import { useRef } from 'react';
import { useScroll, useTransform, useSpring } from 'framer-motion';

/**
 * useScrollParallax
 * Computes smooth spring-damped scroll parallax transforms for a target container.
 * 
 * @param {Object} options
 * @param {number} [options.distance=50] The pixel distance to travel [-distance, distance]
 * @param {string[]} [options.offset=["start end", "end start"]] Framer motion scroll offset triggers
 * @returns {{ ref: React.RefObject, y: MotionValue, opacity: MotionValue }}
 */
export const useScrollParallax = ({ distance = 50, offset = ['start end', 'end start'] } = {}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset
  });

  // Calculate raw Y transform and smooth it with spring physics
  const rawY = useTransform(scrollYProgress, [0, 1], [-distance, distance]);
  const y = useSpring(rawY, { stiffness: 120, damping: 25, mass: 0.5 });

  return { ref, y, scrollYProgress };
};

export default useScrollParallax;
