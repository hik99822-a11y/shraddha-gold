import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Cpu, ShieldCheck, Award, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

const CraftsmanshipShowcase = () => {
  const sectionRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const bannerBgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  const technicalHighlights = [
    {
      icon: Cpu,
      title: 'Induction Vacuum Casting',
      desc: 'Inert argon-gas melting eliminates micro-porosity, guaranteeing dense crystalline gold integrity across intricate filigree.'
    },
    {
      icon: Layers,
      title: 'Micron-Level CAD Engineering',
      desc: 'MatrixGold & Rhino 3D sculpting with parametric weight calculations and digital stone cavity seat mapping.'
    },
    {
      icon: Sparkles,
      title: 'Hereditary Artisan Goldsmithing',
      desc: 'Generational hand-filing, microscopic pave stone setting, and multi-stage rotary rouge mirror polishing.'
    },
    {
      icon: Award,
      title: 'NABL Certified Laser Assay',
      desc: 'Non-destructive XRF spectrometer testing and government-authorized laser BIS hallmarking (916 & 750).'
    }
  ];

  return (
    <section className="craftsmanship-section section-padding bg-brand-subtle" ref={sectionRef}>
      <div className="container">
        {/* Editorial Feature Header */}
        <div className="section-header text-center">
          <div className="luxury-badge">
            <span className="luxury-badge-dot" />
            <span>INDUSTRIAL RIGOR &amp; ARTISTRY</span>
          </div>

          <h2 className="section-title">
            The Science Behind <span className="text-brand-accent">Flawless Gold Casting</span>
          </h2>

          <p className="section-desc">
            We bridge generational jewellery craftsmanship with precision metallurgy, delivering consistent 
            quality from prototype to multi-thousand unit production runs.
          </p>
        </div>

        {/* Section Type 2: Full-Width Editorial Feature Card with Parallax Background */}
        <div className="craftsmanship-editorial-banner luxury-card">
          <motion.div
            className="craftsmanship-banner-bg"
            style={{
              y: shouldReduceMotion ? 0 : bannerBgY,
              backgroundImage: `url('/assets/images/hero/gents-collection.webp')`
            }}
            aria-hidden="true"
          />
          <div className="craftsmanship-banner-overlay" />

          <div className="craftsmanship-banner-content">
            <span className="banner-eyebrow">METALLURGICAL STANDARDS</span>
            <h3 className="banner-title font-serif">
              Zero-Tolerance Quality Control. Every Gram Documented.
            </h3>
            <p className="banner-text">
              Each production batch at Shraddha Gold is stamped with serialized tracking, 
              verifying 100% compliant gold purity, micro-tolerance dimensions, and structural resilience.
            </p>
            <div className="banner-metrics-row">
              <div className="metric-box">
                <span className="metric-number">99.9%</span>
                <span className="metric-label">Casting Density Integrity</span>
              </div>
              <div className="metric-box">
                <span className="metric-number">&plusmn;0.02mm</span>
                <span className="metric-label">Dimensional CNC Tolerance</span>
              </div>
              <div className="metric-box">
                <span className="metric-number">100%</span>
                <span className="metric-label">BIS Laser Hallmarked</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Technical Pillars Grid */}
        <div className="technical-pillars-grid">
          {technicalHighlights.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="technical-pillar-card luxury-card">
                <div className="pillar-icon-box">
                  <Icon size={24} className="pillar-icon" />
                </div>
                <h4 className="pillar-title font-serif">{pillar.title}</h4>
                <p className="pillar-desc">{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CraftsmanshipShowcase;
