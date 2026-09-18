import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Award, Compass, Sparkles, Shield, Flame } from 'lucide-react';

const BrandStoryCinematic = () => {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const yLeft = useTransform(scrollYProgress, [0, 1], ['5%', '-5%']);
  const yRight = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1.05, 0.98]);

  return (
    <section id="scene-brand" ref={containerRef} className="brand-story-scene">
      <div className="brand-story-wrapper">
        {/* Subtle Background Accent */}
        <div className="brand-ambient-glow" />

        <div className="brand-story-grid">
          {/* Left Column: Editorial Lore & Staggered Typography */}
          <motion.div style={{ y: yLeft }} className="brand-narrative-col">
            <div className="brand-eyebrow">
              <span className="brand-eyebrow-line" />
              <span className="brand-eyebrow-text">SCENE 02 • THE FOUNDRY PHILOSOPHY</span>
            </div>

            <h2 className="brand-headline">
              Born from an obsession with detail.
            </h2>

            <p className="brand-lead-quote">
              &ldquo;Every curve, stone, and microscopic facet is mathematically calculated in CAD before our goldsmiths ever touch molten precious metal.&rdquo;
            </p>

            <div className="brand-body-text space-y-4">
              <p>
                Founded over three decades ago, Shraddha Gold has operated as an intimate, high-precision B2B casting house for distinguished jewellers across India and the GCC. We believe true luxury is not manufactured—it is sculpted through thermodynamic discipline and artisan devotion.
              </p>
              <p>
                From our proprietary 1064°C vacuum induction furnaces to microscopic prong settings, every piece embodies the harmonious intersection of high-precision computational engineering and multi-generational goldsmithing heritage.
              </p>
            </div>

            {/* Atelier Metric Chips */}
            <div className="brand-metrics-grid">
              <div className="brand-metric-card">
                <div className="brand-metric-icon">
                  <Award size={18} className="text-gold-light" />
                </div>
                <div className="brand-metric-val">35+</div>
                <div className="brand-metric-lbl">Years of Atelier Heritage</div>
              </div>

              <div className="brand-metric-card">
                <div className="brand-metric-icon">
                  <Flame size={18} className="text-amber-400" />
                </div>
                <div className="brand-metric-val">1064°C</div>
                <div className="brand-metric-lbl">Vacuum Induction Heat</div>
              </div>

              <div className="brand-metric-card">
                <div className="brand-metric-icon">
                  <Compass size={18} className="text-gold-light" />
                </div>
                <div className="brand-metric-val">50,000+</div>
                <div className="brand-metric-lbl">Proprietary CAD Dies</div>
              </div>

              <div className="brand-metric-card">
                <div className="brand-metric-icon">
                  <Shield size={18} className="text-emerald-400" />
                </div>
                <div className="brand-metric-val">100%</div>
                <div className="brand-metric-lbl">BIS 916 Hallmarked</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Parallax Artisan Photography Canvas */}
          <motion.div style={{ y: yRight }} className="brand-imagery-col">
            <div className="brand-image-stack">
              {/* Primary Master Craftsman Frame */}
              <motion.div style={{ scale: imageScale }} className="brand-main-image-box">
                <img
                  src="/assets/images/cinematic/master-craftsman.jpg"
                  alt="Master Goldsmith at Shraddha Gold Atelier Workbench"
                  className="brand-main-img"
                  loading="lazy"
                />
                <div className="brand-image-caption">
                  <Sparkles size={13} className="text-gold-light" />
                  <span>Master Jeweller Inspecting 6-Prong Tension Crown</span>
                </div>
              </motion.div>

              {/* Overlapping Crucible Inset Card */}
              <div className="brand-inset-image-card">
                <img
                  src="/assets/images/forge/molten-gold-crucible.jpg"
                  alt="22KT Pure Gold Crucible Pouring at 1064°C"
                  className="brand-inset-img"
                  loading="lazy"
                />
                <div className="brand-inset-overlay">
                  <span className="brand-inset-tag">FOUNDRY STAGE 04</span>
                  <strong>1064°C Vacuum Crucible</strong>
                </div>
              </div>

              {/* Decorative Atelier Seal */}
              <div className="brand-seal-badge">
                <div className="brand-seal-inner">
                  <span className="brand-seal-gold">SHRADDHA GOLD</span>
                  <span className="brand-seal-sub">ATELIER D'ART</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BrandStoryCinematic;
