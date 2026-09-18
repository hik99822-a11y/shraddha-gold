import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Cpu,
  Layers,
  Flame,
  Gem,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

const STAGES = [
  {
    number: '01',
    title: 'Concept & Gouache Sketch',
    subtitle: 'Artistic Proportion & Vision',
    icon: PenTool,
    image: '/assets/images/hero/designer-collection.webp',
    details: {
      duration: '48–72 Hours',
      tools: 'Pure Graphite, Gouache Pigment, Drafting Vellum',
      focus: 'Harmonic weight balance and structural symmetry'
    },
    desc: 'Every creation starts with hand-rendered gouache paintings studying light reflection, stone geometry, and wearable ergonomics.'
  },
  {
    number: '02',
    title: '3D CAD Matrix Engineering',
    subtitle: 'Micron-Level Parametric Geometry',
    icon: Cpu,
    image: '/assets/images/hero/premium-gold-collection.webp',
    details: {
      duration: '0.01mm Tolerance',
      tools: 'RhinoGold, Matrix CAD, Proprietary Shraddha Die Algorithms',
      focus: 'Calculated shrinkage ratios and prong tensile strength'
    },
    desc: 'Our CAD matrix calculates metal shrinkage dynamics, stone seat clearances, and alloy displacement down to a fraction of a millimetre.'
  },
  {
    number: '03',
    title: '3D Wax Resin Archetype',
    subtitle: 'High-Fidelity Master Prototype',
    icon: Layers,
    image: '/assets/images/cinematic/eclipse-ring.jpg',
    details: {
      duration: '16 Micron Resolution',
      tools: 'DLP Photopolymer Printers, Optical Loupe',
      focus: 'Physical verification of stone seats and finger contours'
    },
    desc: 'High-resolution wax resin prototypes are printed and hand-inspected under optical magnification before entering investment casting.'
  },
  {
    number: '04',
    title: 'Vacuum Induction Casting',
    subtitle: 'Thermodynamic Fusion at 1064°C',
    icon: Flame,
    image: '/assets/images/forge/molten-gold-crucible.jpg',
    details: {
      duration: '1064°C Vacuum Cycle',
      tools: 'Inert Gas Furnace, Centrifugal Crucible',
      focus: 'Complete elimination of microscopic air porosity'
    },
    desc: 'Pure 24KT fine gold is alloyed with master grain additives and melted under vacuum induction, ensuring dense, pore-free structural integrity.'
  },
  {
    number: '05',
    title: 'Microscope Stone Setting',
    subtitle: 'Optically Aligned Pavé & Prongs',
    icon: Gem,
    image: '/assets/images/cinematic/master-craftsman.jpg',
    details: {
      duration: '40x Leica Microscope',
      tools: 'Tungsten Chisels, Pneumatic Gravers',
      focus: 'Zero-tolerance stone security and maximum scintillation'
    },
    desc: 'Master setters position each diamond under Leica surgical microscopes, raising microscopic gold beads to secure stones forever.'
  },
  {
    number: '06',
    title: 'Multi-Compound Hand Polishing',
    subtitle: 'Mirror Specular Luminescence',
    icon: Sparkles,
    image: '/assets/images/cinematic/celestial-necklace.jpg',
    details: {
      duration: '5-Stage Polishing',
      tools: 'Tripoli Paste, Diamond Compound, Cotton Wheels',
      focus: 'Flawless optical reflection on every interior and exterior surface'
    },
    desc: 'Five progressive polishing wheels remove microscopic tool marks, transforming cast gold into a radiant, mirror-specular finish.'
  },
  {
    number: '07',
    title: 'Laser Hallmark & Quality Seal',
    subtitle: 'Government BIS 916 Authentication',
    icon: ShieldCheck,
    image: '/assets/images/hero/authentic-pendant-suites.webp',
    details: {
      duration: '100% Quality Audit',
      tools: 'Fiber Laser Marker, XRF Spectrometer Assayer',
      focus: 'Exact 91.6% purity certification and permanent traceability'
    },
    desc: 'Final acoustic resonance testing, XRF assay verification, and microscopic laser inscription of the official BIS hallmark seal.'
  }
];

const CraftsmanshipPipelineSection = () => {
  const [activeStageIndex, setActiveStageIndex] = useState(3); // Default to molten casting
  const currentStage = STAGES[activeStageIndex];
  const IconComponent = currentStage.icon;

  return (
    <section id="scene-craft" className="craft-scene">
      <div className="craft-wrapper">
        {/* Section Header */}
        <div className="craft-header text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-2">
            <Flame size={12} className="text-amber-400" />
            <span>SCENE 05 • THE ART OF CREATION</span>
          </div>
          <h2 className="craft-title font-serif">
            SEVEN FOUNDRY DISCIPLINES
          </h2>
          <p className="craft-subtitle">
            Trace the chronological physical journey from abstract gouache sketch to BIS-hallmarked gold masterpiece.
          </p>
        </div>

        {/* 7-Step Navigation Stepper Strip */}
        <div className="craft-stepper-container">
          <div className="craft-stepper-track">
            {STAGES.map((s, idx) => {
              const isActive = idx === activeStageIndex;
              const isPast = idx < activeStageIndex;
              return (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => setActiveStageIndex(idx)}
                  className={`craft-step-btn ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`}
                >
                  <span className="craft-step-num font-mono">{s.number}</span>
                  <span className="craft-step-lbl truncate">{s.title.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Showcase Pane */}
        <div className="craft-stage-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage.number}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="craft-stage-grid"
            >
              {/* Left Column: Visual Media Display */}
              <div className="craft-media-box">
                <img
                  src={currentStage.image}
                  alt={currentStage.title}
                  className="craft-stage-img"
                  loading="lazy"
                />
                <div className="craft-media-vignette" />
                <div className="craft-media-badge">
                  <IconComponent size={14} className="text-gold-light" />
                  <span>FOUNDRY STAGE {currentStage.number} OF 07</span>
                </div>
              </div>

              {/* Right Column: Technical Commentary */}
              <div className="craft-details-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono tracking-widest text-gold-light px-2 py-0.5 rounded bg-gold-light/10 border border-gold-light/20">
                    STAGE {currentStage.number}
                  </span>
                  <span className="text-xs text-text-muted">
                    {currentStage.subtitle}
                  </span>
                </div>

                <h3 className="craft-stage-name font-serif">
                  {currentStage.title}
                </h3>

                <p className="craft-stage-desc">
                  {currentStage.desc}
                </p>

                {/* Technical Parameters Table */}
                <div className="craft-params-box">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                    Foundry Benchmarks
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="craft-param-cell">
                      <span className="lbl">Precision:</span>
                      <strong className="val">{currentStage.details.duration}</strong>
                    </div>
                    <div className="craft-param-cell">
                      <span className="lbl">Atelier Tooling:</span>
                      <strong className="val truncate">{currentStage.details.tools}</strong>
                    </div>
                    <div className="craft-param-cell">
                      <span className="lbl">Core Focus:</span>
                      <strong className="val truncate">{currentStage.details.focus}</strong>
                    </div>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="craft-nav-row">
                  <button
                    type="button"
                    disabled={activeStageIndex === 0}
                    onClick={() => setActiveStageIndex((prev) => Math.max(0, prev - 1))}
                    className="craft-nav-btn"
                  >
                    <span>← Previous Stage</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeStageIndex === STAGES.length - 1}
                    onClick={() => setActiveStageIndex((prev) => Math.min(STAGES.length - 1, prev + 1))}
                    className="btn-luxury-gold text-xs py-2 px-4"
                  >
                    <span>Next Stage: {activeStageIndex < STAGES.length - 1 ? STAGES[activeStageIndex + 1].title.split(' ')[0] : 'Complete'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default CraftsmanshipPipelineSection;
