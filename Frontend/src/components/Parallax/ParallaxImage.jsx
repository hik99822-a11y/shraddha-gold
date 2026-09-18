import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import './ParallaxImage.css';

/**
 * ParallaxImage
 * Creates a luxury editorial framed-image parallax effect inspired by SentientX.
 * The container clips the image with overflow: hidden while the image itself
 * scales slightly (1.12 - 1.15) and vertically scrubs as the user scrolls past.
 * 
 * @param {Object} props
 * @param {string} props.src Image URL
 * @param {string} props.alt Alt text
 * @param {number} [props.speed=0.2] Vertical drift intensity
 * @param {string} [props.className=''] CSS classes for the frame
 * @param {string} [props.imgClassName=''] CSS classes for the img element
 * @param {React.ReactNode} [props.children] Optional overlays / badges inside frame
 */
export const ParallaxImage = ({
  src,
  alt = '',
  speed = 0.2,
  className = '',
  imgClassName = '',
  children,
  ...props
}) => {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  // Calculate percentage translation for the image
  const travelPercent = speed * 40; // e.g. -8% to +8%
  const y = useTransform(scrollYProgress, [0, 1], [`-${travelPercent}%`, `${travelPercent}%`]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.14, 1.08, 1.14]);

  if (shouldReduceMotion) {
    return (
      <div ref={containerRef} className={`parallax-image-frame ${className}`} {...props}>
        <img src={src} alt={alt} className={`parallax-inner-img ${imgClassName}`} loading="lazy" />
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`parallax-image-frame ${className}`} {...props}>
      <motion.img
        src={src}
        alt={alt}
        className={`parallax-inner-img ${imgClassName}`}
        style={{ y, scale }}
        loading="lazy"
      />
      {children}
    </div>
  );
};

export default ParallaxImage;
