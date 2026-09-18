import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { processStepsData } from '../../data/process';
import './ProcessTimeline.css';

const ProcessTimeline = () => {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 75%', 'end 35%']
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 25, mass: 0.2 });

  // Update active step based on scroll progress if user is scrolling through
  useEffect(() => {
    if (shouldReduceMotion) return;

    const unsubscribe = scrollYProgress.on('change', (latest) => {
      const stepIndex = Math.min(
        processStepsData.length - 1,
        Math.max(0, Math.floor(latest * processStepsData.length))
      );
      setActiveStep(stepIndex);
    });

    return () => unsubscribe();
  }, [scrollYProgress, shouldReduceMotion]);

  return (
    <div ref={containerRef} className="process-timeline-root">
      {/* Desktop Step Selectors Bar */}
      <div className="process-stepper-bar">
        {processStepsData.map((item, idx) => {
          const isCurrent = idx === activeStep;
          const isPassed = idx < activeStep;
          return (
            <motion.button
              key={item.step}
              type="button"
              className={`stepper-node ${isCurrent ? 'active' : ''} ${isPassed ? 'completed' : ''}`}
              onClick={() => setActiveStep(idx)}
              aria-label={`Step ${item.step}: ${item.title}`}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="stepper-dot">
                <span className="stepper-num">{item.step}</span>
              </div>
              <span className="stepper-label">{item.title.split(' ')[0]}</span>
            </motion.button>
          );
        })}

        {/* Dynamic Brand Green connecting progress line */}
        <motion.div
          className="stepper-progress-fill"
          style={{
            width: `${(activeStep / (processStepsData.length - 1)) * 100}%`
          }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* Active Step Feature Display (Desktop) */}
      <motion.div
        key={activeStep}
        className="active-step-spotlight luxury-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="spotlight-header">
          <span className="spotlight-step-tag font-display">STAGE {processStepsData[activeStep].step}</span>
          <span className="spotlight-subtitle">{processStepsData[activeStep].subtitle}</span>
        </div>
        <h3 className="spotlight-title font-serif">{processStepsData[activeStep].title}</h3>
        <p className="spotlight-desc">{processStepsData[activeStep].description}</p>
        
        <div className="spotlight-nav-actions">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className="spotlight-prev-btn"
          >
            &larr; Previous Stage
          </button>
          <div className="spotlight-dots-indicator">
            {processStepsData.map((_, i) => (
              <span
                key={i}
                className={`indicator-dot ${i === activeStep ? 'active' : ''}`}
                onClick={() => setActiveStep(i)}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={activeStep === processStepsData.length - 1}
            onClick={() => setActiveStep((prev) => Math.min(processStepsData.length - 1, prev + 1))}
            className="spotlight-next-btn"
          >
            Next Stage &rarr;
          </button>
        </div>
      </motion.div>

      {/* Mobile Vertical Timeline Grid */}
      <div className="mobile-process-vertical">
        {processStepsData.map((item, idx) => (
          <motion.div
            key={item.step}
            className="vertical-timeline-item"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
          >
            <div className="vertical-timeline-marker">
              <span className="marker-num font-display">{item.step}</span>
              <div className="marker-line" />
            </div>
            <div className="vertical-timeline-card luxury-card">
              <span className="vertical-subtitle">{item.subtitle}</span>
              <h4 className="vertical-title font-serif">{item.title}</h4>
              <p className="vertical-desc">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProcessTimeline;
