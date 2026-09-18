import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Cpu,
  Layers,
  Flame,
  Truck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

const BESPOKE_STEPS = [
  {
    step: '01',
    title: 'Consultation & Concept',
    icon: MessageSquare,
    desc: 'Share reference sketches, CAD files, or heirloom inspirations with our foundry directors.'
  },
  {
    step: '02',
    title: 'Parametric CAD Matrix',
    icon: Cpu,
    desc: 'Our digital atelier models your design with exact weight, shrinkage, and stone seat calculations.'
  },
  {
    step: '03',
    title: 'Wax Prototype Approval',
    icon: Layers,
    desc: 'Review high-resolution 16-micron 3D printed wax models for ergonomic tactile evaluation.'
  },
  {
    step: '04',
    title: '1064°C Master Casting',
    icon: Flame,
    desc: 'Induction melted in your choice of 22KT Yellow, 18KT Rose, or 950 Platinum.'
  },
  {
    step: '05',
    title: 'Hallmarked Delivery',
    icon: Truck,
    desc: 'Inspected under microscope, certified with BIS 916 hallmark, and dispatched in insured vaults.'
  }
];

const BespokeAtelierSection = ({ onOpenModal }) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleOpenBespokeInquiry = () => {
    if (onOpenModal) {
      onOpenModal({
        name: 'Private Bespoke Atelier Commission',
        styleCode: 'SG-BESPOKE-OEM',
        category: 'Bespoke',
        karat: '22KT / 18KT Custom',
        grossWeight: 0,
        netWeight: 0,
        image: '/assets/images/cinematic/master-craftsman.jpg'
      });
    }
  };

  return (
    <section id="scene-bespoke" className="bespoke-scene">
      <div className="bespoke-wrapper">
        {/* Section Header */}
        <div className="bespoke-header text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-light/10 border border-gold-light/25 text-[11px] font-mono tracking-widest text-gold-light mb-2">
            <Sparkles size={12} className="text-gold-light" />
            <span>SCENE 09 • PRIVATE ATELIER</span>
          </div>
          <h2 className="bespoke-title font-serif">
            MADE FOR YOU
          </h2>
          <p className="bespoke-subtitle">
            From your raw pencil sketch or CAD file to the final BIS-hallmarked gold masterpiece.
          </p>
        </div>

        {/* 5-Step Timeline Graphic */}
        <div className="bespoke-steps-grid">
          {BESPOKE_STEPS.map((s, idx) => {
            const IconComp = s.icon;
            const isCurrent = idx === activeStep;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`bespoke-step-card ${isCurrent ? 'active' : ''}`}
              >
                <div className="bespoke-step-top">
                  <span className="bespoke-step-num font-mono">{s.step}</span>
                  <div className="bespoke-step-icon-box">
                    <IconComp size={16} />
                  </div>
                </div>

                <h3 className="bespoke-step-title font-serif">
                  {s.title}
                </h3>

                <p className="bespoke-step-desc">
                  {s.desc}
                </p>

                <div className="bespoke-step-footer">
                  <span className="bespoke-step-bullet" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Direct Commission CTA Card */}
        <div className="bespoke-action-card">
          <div className="bespoke-action-left">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={16} className="text-emerald-400" />
              <strong className="text-white text-sm font-serif">
                Direct Commercial Foundry Partnership
              </strong>
            </div>
            <p className="text-xs text-text-secondary max-w-xl">
              Partner with Shraddha Gold for your brand’s custom collections. We offer strict design exclusivity, CAD file NDA protection, and wholesale batch casting timelines.
            </p>
          </div>

          <div className="bespoke-action-right">
            <button
              type="button"
              onClick={handleOpenBespokeInquiry}
              className="btn-luxury-gold py-3 px-6 text-xs whitespace-nowrap"
            >
              <span>Initiate Bespoke Commission</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BespokeAtelierSection;
