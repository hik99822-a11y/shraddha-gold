import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { milestonesData } from '../../data/milestones';
import './Milestones.css';

// Helper component for counting up a single number
const AnimatedCounter = ({ value, inView }) => {
  // Parse numeric target, prefix, and suffix
  const numMatch = value.match(/[\d,]+/);
  const rawNumStr = numMatch ? numMatch[0].replace(/,/g, '') : '0';
  const targetNum = parseInt(rawNumStr, 10) || 0;
  const suffix = value.replace(/[\d,]/g, '');

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let startTime = null;
    const duration = 1800; // ms

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easeOut * targetNum);

      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(targetNum);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [inView, targetNum]);

  const formattedNum = targetNum >= 1000 ? count.toLocaleString() : count;

  return (
    <span>
      {formattedNum}
      {suffix}
    </span>
  );
};

const Milestones = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });

  return (
    <div ref={containerRef} className="milestones-grid">
      {milestonesData.map((item, index) => (
        <motion.div
          key={item.id}
          className="milestone-card luxury-card"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{
            duration: 0.7,
            delay: index * 0.15,
            ease: [0.16, 1, 0.3, 1]
          }}
          whileHover={{ y: -6, transition: { duration: 0.25 } }}
        >
          <div className="milestone-card-gold-glow" />
          <div className="milestone-value font-display text-gold-gradient">
            <AnimatedCounter value={item.value} inView={isInView} />
          </div>
          <div className="milestone-label">{item.label}</div>
          <p className="milestone-desc">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default Milestones;
