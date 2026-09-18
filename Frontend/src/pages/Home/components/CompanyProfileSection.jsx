import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Factory, ShieldCheck, Cpu, Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import { companyData } from '../../../data/company';

const chapters = [
  {
    step: '01',
    title: 'Generational Artisan Heritage',
    tagline: '15+ Years Foundry Legacy',
    image: '/assets/images/products/pendant-earrings-suite.webp',
    icon: Factory,
    desc: 'Established in 2008 in Mumbai\'s SEZ jewellery manufacturing district, Shraddha Gold elevates traditional goldsmithing with disciplined industrial engineering.'
  },
  {
    step: '02',
    title: 'Zero-Porosity Induction Casting',
    tagline: 'German Vacuum Metallurgy',
    image: '/assets/images/products/gents-gold-bracelets.webp',
    icon: Cpu,
    desc: 'Pure gold melted under inert argon atmosphere eliminates microscopic porosity, producing crystalline metal density and laser-precise prong tolerances.'
  },
  {
    step: '03',
    title: '100% BIS Certified & Laser Assay',
    tagline: 'Purity Without Compromise',
    image: '/assets/images/products/gold-bangles-kada.webp',
    icon: Award,
    desc: 'Every production batch is accompanied by NABL spectrometer analysis and official laser BIS hallmarking in 18K (750) and 22K (916) fine gold.'
  }
];

const CompanyProfileSection = () => {
  const [activeChapter, setActiveChapter] = useState(0);
  const containerRef = useRef(null);

  const handleChapterClick = (idx) => {
    setActiveChapter(idx);
    const cardEl = document.getElementById(`chapter-card-${idx}`);
    if (cardEl) {
      if (window.lenis) {
        window.lenis.scrollTo(cardEl, { offset: -120 });
      } else {
        cardEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  return (
    <section className="company-profile-section section-padding bg-white" id="company-profile" ref={containerRef}>
      <div className="container">
        <div className="pinned-profile-layout">
          {/* Left Pinned Sticky Column (Jeffrey Milanes Scene-Based Structure) */}
          <div className="profile-sticky-narrative">
            <div className="luxury-badge">
              <span className="luxury-badge-dot" />
              <span>COMPANY PROFILE • FOUNDRY HERITAGE</span>
            </div>

            <h2 className="section-title">
              Generations of Metallurgy Mastery.{' '}
              <span className="text-brand-accent">Artisan Precision.</span>
            </h2>

            <p className="profile-lead-text">
              Precision-engineered B2B fine gold jewellery manufacturing for leading retail houses, 
              private labels, and luxury jewellery brands worldwide.
            </p>

            {/* Chapter Stepper Navigation (Clickable & Active State) */}
            <div className="profile-chapter-stepper">
              {chapters.map((ch, idx) => {
                const Icon = ch.icon;
                const isActive = activeChapter === idx;
                return (
                  <button
                    key={ch.step}
                    type="button"
                    className={`chapter-step-btn ${isActive ? 'step-active' : ''}`}
                    onClick={() => handleChapterClick(idx)}
                  >
                    <span className="chapter-step-number">{ch.step}</span>
                    <div className="chapter-step-info">
                      <span className="chapter-step-title">{ch.title}</span>
                      <span className="chapter-step-tagline">{ch.tagline}</span>
                    </div>
                    <Icon size={16} className="chapter-step-icon" />
                  </button>
                );
              })}
            </div>

            {/* Foundry Credentials Strip */}
            <div className="profile-credentials-box">
              <div className="cred-item">
                <CheckCircle2 size={16} className="cred-icon" />
                <span>100% BIS Hallmarked</span>
              </div>
              <div className="cred-item">
                <CheckCircle2 size={16} className="cred-icon" />
                <span>Mumbai SEZ Facility</span>
              </div>
              <div className="cred-item">
                <CheckCircle2 size={16} className="cred-icon" />
                <span>Full NDA Protection</span>
              </div>
            </div>

            {/* Action Row */}
            <div className="profile-cta-row mt-4">
              <Link to="/about" className="btn btn-brand">
                <span>Explore Full Legacy</span>
                <ArrowRight size={16} className="btn-icon" />
              </Link>
              <a href="#contact" className="btn btn-outline-brand">
                <span>Direct RFQ</span>
              </a>
            </div>
          </div>

          {/* Right Visual Chapter Showcase Column */}
          <div className="profile-visual-cards-track">
            {chapters.map((chapter, idx) => {
              const Icon = chapter.icon;
              return (
                <motion.div
                  key={chapter.step}
                  id={`chapter-card-${idx}`}
                  className="chapter-showcase-card luxury-card"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6 }
                  }}
                  viewport={{ once: false, amount: 0.4 }}
                  onViewportEnter={() => setActiveChapter(idx)}
                >
                  <div className="chapter-card-image-wrap">
                    <img
                      src={chapter.image}
                      alt={chapter.title}
                      className="chapter-card-img"
                      loading="lazy"
                    />
                    <div className="chapter-card-overlay" />
                    <div className="chapter-number-pill">
                      <span>{chapter.step} / 03</span>
                    </div>
                  </div>

                  <div className="chapter-card-body">
                    <div className="chapter-badge-wrap">
                      <Icon size={16} className="text-brand-accent" />
                      <span className="chapter-tagline-text">{chapter.tagline}</span>
                    </div>
                    <h3 className="chapter-card-title font-serif">{chapter.title}</h3>
                    <p className="chapter-card-desc">{chapter.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyProfileSection;
