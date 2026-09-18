import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { 
  Crown, 
  Crosshair, 
  CheckCircle2, 
  Wand2, 
  Factory, 
  Clock 
} from 'lucide-react';
import { whyChooseUsData } from '../../../data/whyChooseUs';

const iconMap = {
  Crown,
  Crosshair,
  CheckCircle2,
  Wand2,
  Factory,
  Clock
};

const WhyChooseUsSection = () => {
  const sectionRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const oddY = useTransform(scrollYProgress, [0, 1], [-20, 20]);
  const evenY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section className="why-choose-section section-padding bg-white" ref={sectionRef}>
      <div className="container">
        <div className="section-header text-center">
          <div className="luxury-badge">
            <span className="luxury-badge-dot" />
            <span>COMMERCIAL ADVANTAGES</span>
          </div>

          <h2 className="section-title">
            Why Leading Brands <span className="text-brand-accent">Partner with Us</span>
          </h2>

          <p className="section-desc">
            Trusted by jewellery retail chains and private labels for unyielding metallurgical integrity, 
            rapid prototype turnaround, and dependable batch scaling.
          </p>
        </div>

        <div className="why-choose-grid">
          {whyChooseUsData.map((item, index) => {
            const IconComponent = iconMap[item.icon] || CheckCircle2;
            const isOdd = index % 2 === 1;

            return (
              <motion.div
                key={item.id}
                className="why-card luxury-card"
                style={{
                  y: shouldReduceMotion ? 0 : (isOdd ? oddY : evenY)
                }}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <div className="why-icon-bubble">
                  <IconComponent size={24} className="why-icon" />
                </div>
                
                <h3 className="why-card-title font-serif">{item.title}</h3>
                
                <p className="why-card-desc">{item.description}</p>
                
                <div className="why-card-indicator" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
