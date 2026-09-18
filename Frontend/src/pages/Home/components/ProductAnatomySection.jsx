import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ShieldCheck, Sparkles, Gem, Layers, ZoomIn, CheckCircle2 } from 'lucide-react';

const HOTSPOTS = [
  {
    id: 'solitaire',
    number: '01',
    title: 'VVS1 Colorless Solitaire',
    tag: 'Center Diamond',
    coord: { top: '22%', left: '50%' },
    desc: '0.85ct brilliant round cut solitaire diamond with 57 mathematically optimized facets for maximum scintillation and fire.'
  },
  {
    id: 'prongs',
    number: '02',
    title: 'Micro-Tension 6-Prongs',
    tag: 'Crown Architecture',
    coord: { top: '35%', left: '40%' },
    desc: 'Six hand-chiseled 22KT gold prongs engineered with tensile grip, allowing 360° light transmission under the pavilion.'
  },
  {
    id: 'shank',
    number: '03',
    title: 'Knife-Edge Comfort Shank',
    tag: 'Ergonomic Band',
    coord: { top: '65%', left: '26%' },
    desc: 'Precision CAD-milled knife-edge band with inner comfort-fit curvature, vacuum cast without microscopic air porosity.'
  },
  {
    id: 'hallmark',
    number: '04',
    title: 'BIS 916 Laser Stamp',
    tag: 'Certification',
    coord: { top: '55%', left: '72%' },
    desc: 'Laser-engraved government hallmark certifying 91.6% pure fine gold alloy composition and foundry traceability.'
  }
];

const ProductAnatomySection = ({ onOpenModal }) => {
  const [activeHotspot, setActiveHotspot] = useState(HOTSPOTS[0]);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleInquire = () => {
    if (onOpenModal) {
      onOpenModal({
        name: 'The Eclipse Solitaire Ring',
        styleCode: 'SG-ECL-916-01',
        category: 'Rings',
        karat: '22KT 916',
        grossWeight: 8.40,
        netWeight: 8.23,
        image: '/assets/images/cinematic/eclipse-ring.jpg'
      });
    }
  };

  return (
    <section id="scene-eclipse" className="anatomy-scene">
      <div className="anatomy-wrapper">
        {/* Section Header */}
        <div className="anatomy-header text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-2">
            <Gem size={12} className="text-gold-light" />
            <span>SCENE 04 • INDIVIDUAL PIECE ANATOMY</span>
          </div>
          <h2 className="anatomy-title font-serif">
            01 — THE ECLIPSE SOLITAIRE RING
          </h2>
          <p className="anatomy-subtitle">
            An intimate dissection of micro-engineering, precious metallurgy, and optical precision.
          </p>
        </div>

        <div className="anatomy-grid">
          {/* Left Canvas: Interactive Masterpiece with Hotspots */}
          <div className="anatomy-visual-pane">
            <div className="anatomy-image-container group">
              <motion.img
                animate={{ scale: zoomLevel }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                src="/assets/images/cinematic/eclipse-ring.jpg"
                alt="The Eclipse Ring — Master CAD Dissection"
                className="anatomy-main-image"
              />
              <div className="anatomy-specular-sweep" />

              {/* Interactive Hotspot Pins */}
              {HOTSPOTS.map((h) => {
                const isActive = activeHotspot.id === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setActiveHotspot(h)}
                    style={{ top: h.coord.top, left: h.coord.left }}
                    className={`anatomy-hotspot-pin ${isActive ? 'active' : ''}`}
                    title={h.title}
                    aria-label={`Hotspot ${h.number}: ${h.title}`}
                  >
                    <span className="anatomy-hotspot-pulse" />
                    <span className="anatomy-hotspot-dot">{h.number}</span>
                  </button>
                );
              })}

              {/* Zoom Controls */}
              <div className="anatomy-zoom-dock">
                <button
                  type="button"
                  onClick={() => setZoomLevel(zoomLevel === 1 ? 1.35 : 1)}
                  className="anatomy-zoom-btn"
                >
                  <ZoomIn size={14} />
                  <span>{zoomLevel === 1 ? 'Loupe Zoom (1.35x)' : 'Reset Scale'}</span>
                </button>
              </div>
            </div>

            {/* Active Hotspot Preview Banner */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHotspot.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="anatomy-hotspot-callout"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold-light/20 text-gold-light border border-gold-light/30">
                    FOCUS {activeHotspot.number} • {activeHotspot.tag}
                  </span>
                  <h4 className="font-semibold text-white text-sm">
                    {activeHotspot.title}
                  </h4>
                </div>
                <p className="text-xs text-text-secondary">
                  {activeHotspot.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Canvas: Technical Specification Dossier */}
          <div className="anatomy-dossier-pane">
            <div className="anatomy-dossier-card">
              <div className="anatomy-dossier-header">
                <div>
                  <span className="text-[11px] font-mono text-gold-light tracking-wider">
                    SPECIFICATION DOSSIER
                  </span>
                  <h3 className="font-serif text-xl font-bold text-white mt-0.5">
                    Engineering Benchmarks
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  BIS 916
                </span>
              </div>

              {/* Specs Table */}
              <div className="anatomy-specs-list divide-y divide-border-subtle">
                <div className="anatomy-spec-row-item">
                  <span className="lbl">Precious Alloy:</span>
                  <div className="text-right">
                    <strong className="text-white block font-medium">22KT Royal Yellow Gold</strong>
                    <span className="text-[11px] text-text-muted">91.6% Pure Fine Gold Standard</span>
                  </div>
                </div>

                <div className="anatomy-spec-row-item">
                  <span className="lbl">Center Gemstone:</span>
                  <div className="text-right">
                    <strong className="text-white block font-medium">0.85 ct Solitaire Diamond</strong>
                    <span className="text-[11px] text-text-muted">VVS1 Clarity • Colorless (D-F)</span>
                  </div>
                </div>

                <div className="anatomy-spec-row-item">
                  <span className="lbl">Foundry Method:</span>
                  <div className="text-right">
                    <strong className="text-white block font-medium">Vacuum Induction Cast</strong>
                    <span className="text-[11px] text-text-muted">1064°C Melt • Zero Micro-Porosity</span>
                  </div>
                </div>

                <div className="anatomy-spec-row-item">
                  <span className="lbl">Crown Setting:</span>
                  <div className="text-right">
                    <strong className="text-white block font-medium">6-Prong Micro-Tension</strong>
                    <span className="text-[11px] text-text-muted">Hand-chiseled & laser-anchored</span>
                  </div>
                </div>

                <div className="anatomy-spec-row-item">
                  <span className="lbl">Weight Ratio:</span>
                  <div className="text-right">
                    <strong className="text-gold-light font-mono block">8.40g Gross / 8.23g Net</strong>
                    <span className="text-[11px] text-text-muted">High-density solid cast</span>
                  </div>
                </div>
              </div>

              {/* Quality Checklist */}
              <div className="p-3 bg-neutral-900/60 rounded-lg border border-border-subtle space-y-2 mt-4">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>3-Point Microscope Acoustic Resonance Tested</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>100% Non-Porous Surface for Superior Polish Life</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <span>Government Hallmarked with Unique Laser ID</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleInquire}
                  className="btn-luxury-gold flex-1 justify-center py-2.5 text-xs"
                >
                  <Sparkles size={14} />
                  <span>Inquire CAD Master Matrix</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductAnatomySection;
