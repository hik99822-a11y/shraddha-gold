import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { milestonesData } from '../../../data/milestones';

// Animated counter hook with ease-out interpolation
const AnimatedCounter = ({ value, inView }) => {
  const [displayValue, setDisplayValue] = useState(0);

  // Parse target number and suffix (+, %)
  const match = value.match(/([\d,]+)(\D*)/);
  const targetNumber = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
  const suffix = match ? match[2] : '';

  useEffect(() => {
    if (!inView) return;

    let startTimestamp = null;
    const duration = 1800; // ms

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out expo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeProgress * targetNumber);

      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetNumber);
      }
    };

    const frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [inView, targetNumber]);

  return (
    <span className="milestone-digit font-serif">
      {displayValue.toLocaleString()}
      <span className="milestone-suffix">{suffix}</span>
    </span>
  );
};

const MilestonesSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' });

  return (
    <section className="milestones-banner-section section-padding bg-light-brand" id="milestones" ref={sectionRef}>
      <div className="container">
        <div className="milestones-strip-grid">
          {milestonesData.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              className="milestone-stat-block"
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 0.7, delay: index * 0.12 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="milestone-value-wrap">
                <AnimatedCounter value={milestone.value} inView={isInView} />
              </div>
              <h3 className="milestone-label">{milestone.label}</h3>
              <p className="milestone-subtext">{milestone.description}</p>
              <div className="milestone-accent-dot" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MilestonesSection;
