import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, MessageCircle, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react';

const FinalEmotionalCtaSection = () => {
  const navigate = useNavigate();

  return (
    <section id="scene-final" className="final-cta-scene">
      {/* Background Atmosphere */}
      <div className="final-cta-backdrop">
        <div className="final-cta-radial-glow" />
        <div className="final-cta-particles" />
      </div>

      <div className="final-cta-wrapper text-center">
        {/* Top Monogram Seal */}
        <div className="final-cta-seal">
          <img
            src="/logo-white.png"
            alt="Shraddha Gold India Pvt. Ltd."
            className="final-cta-logo"
            loading="lazy"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-4">
          <Sparkles size={12} className="text-gold-light" />
          <span>SCENE 10 • THE LIVING LEGACY</span>
        </div>

        <h2 className="final-cta-headline font-serif">
          JEWELLERY THAT BECOMES PART OF YOUR STORY.
        </h2>

        <p className="final-cta-subtext">
          Where pure 22KT gold and natural conflict-free diamonds are forged into enduring heirlooms that transcend generations.
        </p>

        {/* Dual Primary Luxury Actions */}
        <div className="final-cta-button-group">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn-luxury-gold py-3.5 px-8 text-sm"
          >
            <span>Explore Complete Portfolio</span>
            <ArrowRight size={16} />
          </button>

          <a
            href="https://wa.me/919825012345?text=Hello%20Shraddha%20Gold%2C%20I%20would%20like%20to%20inquire%20about%20your%20B2B%20jewellery%20collections."
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury-outline py-3.5 px-8 text-sm flex items-center gap-2"
          >
            <MessageCircle size={16} className="text-emerald-400" />
            <span>Direct WhatsApp Commercial Desk</span>
          </a>
        </div>

        {/* Foundry Credentials Bar */}
        <div className="final-cta-credentials-bar">
          <div className="final-credential-item">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>100% BIS 916 Hallmarked</span>
          </div>
          <span className="final-credential-sep">•</span>
          <div className="final-credential-item">
            <Sparkles size={14} className="text-gold-light" />
            <span>Conflict-Free Natural Diamonds</span>
          </div>
          <span className="final-credential-sep">•</span>
          <div className="final-credential-item">
            <Phone size={14} className="text-gold-light" />
            <span>+91 98250 12345 (Foundry Direct)</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalEmotionalCtaSection;
