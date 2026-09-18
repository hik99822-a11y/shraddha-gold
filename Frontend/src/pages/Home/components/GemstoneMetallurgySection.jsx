import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Award, ShieldCheck, Sparkles, Scale, CheckCircle2 } from 'lucide-react';

const GemstoneMetallurgySection = () => {
  const [activeTab, setActiveTab] = useState('diamonds'); // 'diamonds' | 'gold'

  return (
    <section id="scene-gemstone" className="gemstone-scene">
      <div className="gemstone-wrapper">
        {/* Section Header */}
        <div className="gemstone-header text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-2">
            <Sparkles size={12} className="text-gold-light" />
            <span>SCENE 06 • PRECIOUS MATERIALS</span>
          </div>
          <h2 className="gemstone-title font-serif">
            THE ELEMENTS OF PERFECTION
          </h2>
          <p className="gemstone-subtitle">
            Every piece is created from conflict-free natural diamonds and certified fine bullion alloys.
          </p>

          {/* Interactive Material Switcher */}
          <div className="gemstone-tab-switch">
            <button
              type="button"
              onClick={() => setActiveTab('diamonds')}
              className={`gemstone-switch-btn ${activeTab === 'diamonds' ? 'active' : ''}`}
            >
              <Gem size={15} />
              <span>Natural Diamonds &amp; 4Cs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gold')}
              className={`gemstone-switch-btn ${activeTab === 'gold' ? 'active' : ''}`}
            >
              <Award size={15} />
              <span>22KT &amp; 18KT Gold Metallurgy</span>
            </button>
          </div>
        </div>

        {/* Dynamic Material Pane */}
        <div className="gemstone-content-card">
          <AnimatePresence mode="wait">
            {activeTab === 'diamonds' ? (
              <motion.div
                key="diamonds"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="gemstone-matrix-grid"
              >
                {/* 4Cs Matrix Breakdown */}
                <div className="gemstone-4c-col space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-white text-sm font-serif">01. Precision Cut</strong>
                      <span className="text-[10px] font-mono text-gold-light">57 FACETS</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Mathematically calibrated proportions ensuring 99.8% total internal light reflection through the crown table.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-white text-sm font-serif">02. Colorless Grade</strong>
                      <span className="text-[10px] font-mono text-gold-light">D — F RANGE</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Only exceptional ice-white, colorless stones are hand-selected for our bridal and celestial high-jewellery suites.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-white text-sm font-serif">03. Micro-Clarity</strong>
                      <span className="text-[10px] font-mono text-gold-light">FLAWLESS — VVS1</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Inspected under 40x optical magnification. Zero eye-visible carbon inclusions or structural clouds.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-white text-sm font-serif">04. Calibrated Carat</strong>
                      <span className="text-[10px] font-mono text-gold-light">±0.005ct ACCURACY</span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Calibrated sieve sorting guarantees that eternity bands and pavé crowns seat seamlessly with identical table height.
                    </p>
                  </div>
                </div>

                {/* Right Visual / Sourcing Guarantee */}
                <div className="gemstone-visual-col">
                  <div className="gemstone-visual-box">
                    <img
                      src="/assets/images/cinematic/celestial-necklace.jpg"
                      alt="Diamond Brilliance and Scintillation"
                      className="gemstone-visual-img"
                    />
                    <div className="gemstone-visual-overlay" />
                    <div className="gemstone-guarantee-badge">
                      <ShieldCheck size={18} className="text-emerald-400" />
                      <div>
                        <strong>100% Conflict-Free Natural Diamonds</strong>
                        <span>Kimberley Process Certified • IGI / GIA Standards</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="gold"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="gemstone-matrix-grid"
              >
                {/* Gold Alloys Metallurgy */}
                <div className="gemstone-4c-col space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-gold-light text-sm font-serif">22KT Royal Yellow Gold (916)</strong>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold-light/20 text-gold-light">
                        91.6% PURE GOLD
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Formulated with proprietary silver-copper master alloy grain for maximum ductile flexibility, rich deep luster, and crack resistance.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-rose-300 text-sm font-serif">18KT Blush Rose Gold (750)</strong>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        75.0% PURE GOLD
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Enriched with oxygen-free electrolytic copper for an everlasting romantic blush tone that resists oxidation and color degradation.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg border border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-slate-200 text-sm font-serif">18KT White Gold &amp; Platinum (950)</strong>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-400/20 text-slate-200">
                        PALLADIUM ALLOY
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Alloyed with rare palladium and electroplated with pure rhodium for exceptional specular brightness and diamond contrast.
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <strong className="text-white text-xs">Zero-Porosity Guarantee</strong>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Every batch undergoes continuous vacuum degassing at 1064°C, preventing microscopic voids or brittle crystal boundaries.
                    </p>
                  </div>
                </div>

                {/* Right Visual: Molten Ingot Crucible */}
                <div className="gemstone-visual-col">
                  <div className="gemstone-visual-box">
                    <img
                      src="/assets/images/forge/molten-gold-crucible.jpg"
                      alt="Vacuum Induction Melting of 22KT Fine Gold"
                      className="gemstone-visual-img"
                    />
                    <div className="gemstone-visual-overlay" />
                    <div className="gemstone-guarantee-badge">
                      <Award size={18} className="text-gold-light" />
                      <div>
                        <strong>Government Assayed &amp; BIS 916 Certified</strong>
                        <span>XRF Spectrometer Tested • Every Gram Traceable</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default GemstoneMetallurgySection;
