import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Compass } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'rings',
    num: '01',
    name: 'Rings & Solitaires',
    tagline: 'Architectural six-prong crowns, knife-edge bands, and micro-pavé halos.',
    image: '/assets/images/cinematic/eclipse-ring.jpg',
    metric: '450+ Active CAD Matrices'
  },
  {
    id: 'necklaces',
    num: '02',
    name: 'Royal Necklaces & Chokers',
    tagline: 'Fluid neckline articulation, cascading diamonds, and regal temple harams.',
    image: '/assets/images/cinematic/celestial-necklace.jpg',
    metric: '180+ Haute Suites'
  },
  {
    id: 'bangles',
    num: '03',
    name: 'Artisan Bangles & Kadas',
    tagline: 'Deep-relief floral fluting, heavy gauge sovereign kadas, and safety plunge locks.',
    image: '/assets/images/products/gold-bangles-kada.webp',
    metric: '320+ Precision Sizes'
  },
  {
    id: 'bracelets',
    num: '04',
    name: 'Precision Bracelets',
    tagline: 'Zero-friction articulated links, diamond tennis bracelets, and luxury watch bands.',
    image: '/assets/images/products/custom-oem-bracelets.webp',
    metric: '210+ Cast Styles'
  },
  {
    id: 'bespoke',
    num: '05',
    name: 'Private Bespoke Atelier',
    tagline: 'Custom CAD conceptualization, resin prototyping, and white-glove master casting.',
    image: '/assets/images/cinematic/master-craftsman.jpg',
    metric: 'Dedicated Master Goldsmiths'
  }
];

const EditorialCurtainNav = () => {
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const navigate = useNavigate();

  const handleCategoryClick = (cat) => {
    if (cat.id === 'bespoke') {
      const el = document.getElementById('scene-bespoke');
      if (el) {
        if (window.lenis) {
          window.lenis.scrollTo(el, { offset: -40 });
        } else {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      navigate(`/products?category=${encodeURIComponent(cat.name)}`);
    }
  };

  return (
    <section id="scene-curtain" className="curtain-scene">
      <div className="curtain-wrapper">
        {/* Section Header */}
        <div className="curtain-header mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-2">
            <Compass size={12} className="text-gold-light" />
            <span>SCENE 08 • THE CURATOR</span>
          </div>
          <h2 className="curtain-title font-serif">
            EXPLORE BY DISCIPLINE
          </h2>
        </div>

        <div className="curtain-split-grid">
          {/* Left Column: Interactive Editorial List */}
          <div className="curtain-list-col">
            <nav className="curtain-nav-list" aria-label="Explore jewellery disciplines">
              {CATEGORIES.map((cat) => {
                const isActive = activeCat.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseEnter={() => setActiveCat(cat)}
                    onClick={() => handleCategoryClick(cat)}
                    className={`curtain-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="curtain-item-num font-mono text-xs">{cat.num}</span>
                      <span className="curtain-item-name font-serif">{cat.name}</span>
                    </div>

                    <div className="curtain-item-action">
                      <span className="text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        VIEW DISCIPLINE
                      </span>
                      <ArrowUpRight size={18} className="curtain-arrow-icon" />
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Column: Morphing Curtain Visual Stage */}
          <div className="curtain-preview-col">
            <div className="curtain-preview-card">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCat.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="curtain-preview-inner"
                >
                  <img
                    src={activeCat.image}
                    alt={activeCat.name}
                    className="curtain-preview-img"
                  />
                  <div className="curtain-preview-vignette" />

                  {/* Overlay Metadata */}
                  <div className="curtain-preview-meta">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold-light/20 text-gold-light border border-gold-light/30">
                        {activeCat.num} • {activeCat.metric}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-white mb-1">
                      {activeCat.name}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed mb-3">
                      {activeCat.tagline}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleCategoryClick(activeCat)}
                      className="btn-luxury-gold text-xs py-2 px-4 inline-flex items-center gap-1.5"
                    >
                      <span>Explore Collection</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditorialCurtainNav;
