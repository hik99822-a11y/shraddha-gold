import React from 'react';
import { Link } from 'react-router-dom';
import { Gem, ShieldCheck, Factory, Award, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import Button from '../../components/Button/Button';
import './About.css';

const About = () => {
  return (
    <div className="about-page-root">
      {/* Page Header */}
      <section className="page-hero-banner">
        <div className="container">
          <div className="luxury-badge mb-3">
            <Gem size={12} className="text-gold" />
            <span>Foundry Heritage &amp; Industrial Philosophy</span>
          </div>
          <h1 className="page-hero-title font-serif">
            The Architecture of <span className="text-gold-gradient">Gold Excellence.</span>
          </h1>
          <p className="page-hero-desc">
            Discover the legacy, engineering precision, and artisan traditions that define 
            Shraddha Gold as India's premier B2B fine gold jewellery manufacturer.
          </p>
        </div>
      </section>

      {/* Main Narrative Section */}
      <section className="section-padding">
        <div className="container">
          <div className="narrative-grid">
            <div className="narrative-content">
              <SectionTitle
                badge="Our Legacy"
                title="Generations of Metallurgy"
                highlight="Mastery"
                align="left"
              />
              <p className="narrative-lead">
                Shraddha Gold was established with a singular vision: to elevate gold jewellery 
                manufacturing from fragmented benchwork into a disciplined, high-precision industrial standard.
              </p>
              <p className="narrative-text">
                Over 15+ years of operations, we have grown from a boutique casting foundry in Mumbai 
                into an integrated manufacturing partner for leading retail chains, private labels, and 
                international jewellery houses. We believe that true luxury lies at the intersection of 
                time-honored hand craftsmanship and micron-level digital engineering.
              </p>
              <p className="narrative-text">
                Every piece leaving our facility carries serialized metallurgical documentation, 
                guaranteeing 100% compliant gold purity, zero casting porosity, and the highest standard 
                of structural ergonomics.
              </p>

              <div className="stats-strip">
                <div className="strip-item">
                  <span className="strip-val font-display">15+</span>
                  <span className="strip-label">Years Foundry Experience</span>
                </div>
                <div className="strip-item">
                  <span className="strip-val font-display">10,000+</span>
                  <span className="strip-label">Pieces Manufactured</span>
                </div>
                <div className="strip-item">
                  <span className="strip-val font-display">100%</span>
                  <span className="strip-label">BIS Hallmark Compliance</span>
                </div>
              </div>
            </div>

            <div className="narrative-visual">
              <div className="narrative-img-frame luxury-card">
                <img
                  src="/assets/images/products/gents-gold-bracelets.webp"
                  alt="Fine Gold Craftsmanship at Shraddha Gold"
                  className="narrative-img"
                />
                <div className="narrative-overlay" />
                <div className="narrative-card-caption glass-panel">
                  <span className="caption-gold font-display">SHRADDHA GOLD FOUNDRY</span>
                  <p className="caption-text">Certified Zero-Porosity Induction Casting Lab</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values / Commitments */}
      <section className="section-padding values-section">
        <div className="container">
          <SectionTitle
            badge="Guiding Principles"
            title="Our Four Pillars of"
            highlight="Manufacturing Discipline"
            description="How we safeguard brand integrity and deliver consistent quality to our commercial partners."
          />

          <div className="values-grid">
            <div className="value-card luxury-card">
              <div className="val-icon-box">
                <ShieldCheck size={24} className="text-gold" />
              </div>
              <h3 className="val-title">Absolute Metallurgical Purity</h3>
              <p className="val-desc">
                We formulate our 18K, 22K, and 24K master alloys using pure 999.9 fine bullion. 
                Rigorous spectrometer assaying verifies legal standard compliance on every batch.
              </p>
            </div>

            <div className="value-card luxury-card">
              <div className="val-icon-box">
                <Factory size={24} className="text-gold" />
              </div>
              <h3 className="val-title">Digital &amp; Physical Symbiosis</h3>
              <p className="val-desc">
                From MatrixGold parametric 3D CAD to computerized induction casting, our technical 
                process eliminates human error while preserving hereditary artisan finesse.
              </p>
            </div>

            <div className="value-card luxury-card">
              <div className="val-icon-box">
                <Users size={24} className="text-gold" />
              </div>
              <h3 className="val-title">Client NDA &amp; Design Exclusivity</h3>
              <p className="val-desc">
                We maintain ironclad non-disclosure protocols. Client CAD archives, bespoke molds, 
                and signature collection catalogs remain strictly confidential and protected.
              </p>
            </div>

            <div className="value-card luxury-card">
              <div className="val-icon-box">
                <Award size={24} className="text-gold" />
              </div>
              <h3 className="val-title">Dependable Global Logistics</h3>
              <p className="val-desc">
                We coordinate seamlessly with bonded customs and insured logistics couriers (Brinks, 
                Malca-Amit, BVC) for prompt, insured deliveries across domestic and international ports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Factory Tour / CTA */}
      <section className="section-padding">
        <div className="container">
          <div className="factory-cta-box luxury-card">
            <div className="factory-cta-content">
              <h2 className="font-serif text-white mb-3">Schedule an Executive Foundry Inspection</h2>
              <p className="text-secondary max-w-600 mb-4">
                We invite procurement directors, retail jewellery principals, and brand founders 
                to tour our Mumbai manufacturing labs, meet our master goldsmiths, and review our QC facilities.
              </p>
              <Link to="/contact">
                <Button variant="gold" icon={ArrowRight}>
                  Request Commercial Consultation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
