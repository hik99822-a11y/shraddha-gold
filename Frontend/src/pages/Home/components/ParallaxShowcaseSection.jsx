import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowRight, Eye, Diamond } from 'lucide-react';

const ParallaxShowcaseSection = ({ onOpenModal }) => {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  // Multi-plane parallax translations
  const xNecklace = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const yNecklace = useTransform(scrollYProgress, [0, 1], ['5%', '-5%']);
  const rotateNecklace = useTransform(scrollYProgress, [0, 1], [-2, 2]);
  const scaleNecklace = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1.04, 0.98]);

  const yText = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  const scrollToBespoke = () => {
    const el = document.getElementById('scene-bespoke');
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -40 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="scene-showcase" ref={containerRef} className="showcase-scene">
      {/* Ambient Velvet & Particle Backdrop */}
      <div className="showcase-backdrop">
        <div className="showcase-glow-center" />
        <div className="showcase-mesh-texture" />
      </div>

      <div className="showcase-container">
        {/* Floating Narrative Content */}
        <motion.div style={{ y: yText }} className="showcase-content-box">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-3">
            <Diamond size={12} className="text-gold-light" />
            <span>SCENE 07 • CINEMATIC SHOWCASE</span>
          </div>

          <h2 className="showcase-headline font-serif">
            WHERE LIGHT BECOMES LEGACY
          </h2>

          <p className="showcase-subtext">
            Every facet of our high-jewellery masterpieces is individually balanced to capture ambient light and project scintillation across every room.
          </p>

          <div className="showcase-actions">
            <button
              type="button"
              onClick={scrollToBespoke}
              className="btn-luxury-gold"
            >
              <span>Commission Bespoke Piece</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>

        {/* Floating Masterpiece Canvas (Parallax scrubbed) */}
        <motion.div
          style={{
            x: xNecklace,
            y: yNecklace,
            rotate: rotateNecklace,
            scale: scaleNecklace
          }}
          className="showcase-floating-piece"
        >
          <div className="showcase-piece-halo" />
          <img
            src="/assets/images/cinematic/celestial-necklace.jpg"
            alt="The Constellation Diamond Cascade Necklace"
            className="showcase-piece-img"
            loading="lazy"
          />
          <div className="showcase-piece-card">
            <span className="text-[10px] font-mono text-gold-light block mb-0.5">
              THE CONSTELLATION CHOKER
            </span>
            <strong className="text-white text-xs block font-serif">
              4.20ct Natural Diamonds • 18KT White Gold &amp; Platinum
            </strong>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ParallaxShowcaseSection;
