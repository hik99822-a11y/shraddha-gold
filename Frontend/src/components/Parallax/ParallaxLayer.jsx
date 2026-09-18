import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import './ParallaxLayer.css';

/**
 * ParallaxLayer
 * Reusable wrapper component for multi-layer scroll and decorative depth.
 * 
 * @param {Object} props
 * @param {number} [props.speed=0.2] Speed ratio (-1 to 1) relative to scroll
 * @param {number} [props.mouseX=0] Subtle horizontal mouse shift (pixels)
 * @param {number} [props.mouseY=0] Subtle vertical mouse shift (pixels)
 * @param {string} [props.className=''] Custom CSS classes
 * @param {React.ReactNode} props.children Children nodes
 */
export const ParallaxLayer = ({
  speed = 0.2,
  mouseX = 0,
  mouseY = 0,
  className = '',
  style = {},
  children,
  ...props
}) => {
  const ref = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });

  // Calculate vertical travel distance based on speed
  const distance = speed * 100;
  const scrollY = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={`parallax-layer ${className}`} style={style} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={`parallax-layer ${className}`}
      style={{
        y: scrollY,
        x: mouseX,
        ...style
      }}
      animate={{
        y: undefined, // Let style.y handle scroll
        translateX: mouseX,
        translateY: mouseY
      }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        mass: 0.5
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxLayer;
