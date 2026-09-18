import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, ShoppingBag, ArrowRight, ShieldCheck, Gem } from 'lucide-react';

const CELESTIAL_PRODUCTS = [
  {
    id: 'celestial-01',
    name: 'The Nova Solitaire Ring',
    code: 'SG-NOVA-916',
    category: 'Rings',
    karat: '22KT 916',
    grossWeight: 8.40,
    netWeight: 8.23,
    gemstone: '0.85ct VVS1 Diamond',
    image: '/assets/images/cinematic/eclipse-ring.jpg',
    tag: 'Signature Solitaire',
    desc: 'Six-prong architectural micro-tension setting engineered in 22K fine yellow gold with knife-edge comfort band.'
  },
  {
    id: 'celestial-02',
    name: 'The Constellation Choker',
    code: 'SG-CONST-750',
    category: 'Necklaces',
    karat: '18KT 750',
    grossWeight: 42.10,
    netWeight: 38.80,
    gemstone: '4.20ct Marquise & Round Diamonds',
    image: '/assets/images/cinematic/celestial-necklace.jpg',
    tag: 'High Jewellery',
    desc: 'Cascading celestial flora motif in 18K white gold and platinum alloy, engineered for fluid neckline articulation.'
  },
  {
    id: 'celestial-03',
    name: 'The Aurora Artisan Bangle',
    code: 'SG-AUR-916',
    category: 'Bangles',
    karat: '22KT 916',
    grossWeight: 28.50,
    netWeight: 28.50,
    gemstone: 'Solid Pure Gold',
    image: '/assets/images/products/gold-bangles-kada.webp',
    tag: 'Royal Heritage',
    desc: 'Deep relief hand-carved floral fluting with safety double-plunge hinge lock for commercial luxury boutiques.'
  },
  {
    id: 'celestial-04',
    name: 'The Eclipse Diamond Pendant Suite',
    code: 'SG-ECL-916',
    category: 'Pendants',
    karat: '22KT 916',
    grossWeight: 16.80,
    netWeight: 16.10,
    gemstone: '1.10ct Brilliant Diamond',
    image: '/assets/images/products/pendant-earrings-suite.webp',
    tag: 'Bridal Suite',
    desc: 'Matched teardrop pendant and chandelier drops with precision-drilled laser diamond bails.'
  },
  {
    id: 'celestial-05',
    name: 'The Astral Royal Kada',
    code: 'SG-AST-916',
    category: 'Kadas',
    karat: '22KT 916',
    grossWeight: 38.60,
    netWeight: 38.60,
    gemstone: 'Solid 916 Gold',
    image: '/assets/images/hero/authentic-timepieces-bangles.webp',
    tag: 'Men’s Sovereign',
    desc: 'Heavy gauge sovereign kada featuring geometric CAD faceting and high-polish specular chamfers.'
  },
  {
    id: 'celestial-06',
    name: 'The Zenith Sapphire Station Chain',
    code: 'SG-ZEN-750',
    category: 'Necklaces',
    karat: '18KT 750',
    grossWeight: 21.40,
    netWeight: 19.80,
    gemstone: 'Ceylon Royal Blue Sapphires',
    image: '/assets/images/products/royal-sapphire-chain.webp',
    tag: 'Precious Gem',
    desc: 'Bezel-encased natural Ceylon sapphires intertwined with diamond cut curb links in 18K yellow gold.'
  }
];

const CelestialCollectionSection = ({ onOpenModal }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [hoveredProduct, setHoveredProduct] = useState(null);

  const filteredProducts = activeFilter === 'All'
    ? CELESTIAL_PRODUCTS
    : CELESTIAL_PRODUCTS.filter((p) => p.karat.includes(activeFilter));

  const handleInquire = (product) => {
    if (onOpenModal) {
      onOpenModal({
        name: product.name,
        styleCode: product.code,
        category: product.category,
        karat: product.karat,
        grossWeight: product.grossWeight,
        netWeight: product.netWeight,
        image: product.image
      });
    }
  };

  return (
    <section id="scene-celestial" className="celestial-scene">
      <div className="celestial-wrapper">
        {/* Section Header */}
        <div className="celestial-header text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-3">
            <Sparkles size={12} className="text-gold-light" />
            <span>SCENE 03 • SIGNATURE COLLECTION</span>
          </div>

          <h2 className="celestial-title font-serif">
            THE CELESTIAL COLLECTION
          </h2>

          <p className="celestial-subtitle">
            Inspired by the timeless movement of stars, created in conflict-free diamonds and sculpted 22KT gold.
          </p>

          {/* Karat Filter Tabs */}
          <div className="celestial-filter-bar">
            {['All', '22KT', '18KT'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`celestial-filter-btn ${activeFilter === tab ? 'active' : ''}`}
              >
                <span>{tab === 'All' ? 'All Masterpieces' : `${tab} Editions`}</span>
                {activeFilter === tab && (
                  <motion.span
                    layoutId="activeCelestialTab"
                    className="celestial-filter-indicator"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid / Staggered Cards */}
        <motion.div layout className="celestial-grid">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
                className="celestial-card group"
              >
                {/* Image Container with Specular Sheen */}
                <div className="celestial-image-box">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="celestial-product-img"
                    loading="lazy"
                  />
                  <div className="celestial-img-vignette" />

                  {/* Top Badges */}
                  <div className="celestial-card-top-badges">
                    <span className="celestial-tag-badge">{product.tag}</span>
                    <span className="celestial-karat-badge">{product.karat}</span>
                  </div>

                  {/* Hover Quick Action Overlay */}
                  <div className="celestial-quick-overlay">
                    <button
                      type="button"
                      onClick={() => handleInquire(product)}
                      className="celestial-inquire-btn"
                    >
                      <ShoppingBag size={14} />
                      <span>Request CAD Batch Quote</span>
                    </button>
                  </div>
                </div>

                {/* Product Metadata */}
                <div className="celestial-card-body">
                  <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
                    <span>{product.code}</span>
                    <span>{product.category}</span>
                  </div>

                  <h3 className="celestial-card-name font-serif">
                    {product.name}
                  </h3>

                  <p className="celestial-card-desc">
                    {product.desc}
                  </p>

                  {/* Spec Row */}
                  <div className="celestial-spec-row">
                    <div className="celestial-spec-item">
                      <span className="lbl">Gross Wt:</span>
                      <strong className="val text-gold-light">{product.grossWeight}g</strong>
                    </div>
                    <div className="celestial-spec-item">
                      <span className="lbl">Net Wt:</span>
                      <strong className="val">{product.netWeight}g</strong>
                    </div>
                    <div className="celestial-spec-item">
                      <span className="lbl">Gemstone:</span>
                      <strong className="val text-emerald-400 truncate max-w-[120px]">{product.gemstone}</strong>
                    </div>
                  </div>

                  {/* Direct Action Link */}
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleInquire(product)}
                      className="text-xs text-gold-light hover:text-white font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <span>Inquire Specifications</span>
                      <ArrowRight size={13} />
                    </button>
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <ShieldCheck size={11} className="text-emerald-400" />
                      <span>BIS Hallmarked</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default CelestialCollectionSection;
