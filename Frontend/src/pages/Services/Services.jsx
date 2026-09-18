import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import Button from '../../components/Button/Button';
import ServiceCard from '../../components/ServiceCard/ServiceCard';
import InquiryModal from '../../components/InquiryModal/InquiryModal';
import { servicesData } from '../../data/services';
import './Services.css';

const Services = () => {
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  return (
    <div className="services-page-root">
      {/* Page Header Banner */}
      <section className="page-hero-banner">
        <div className="container">
          <div className="luxury-badge mb-3">
            <Sparkles size={12} className="text-gold" />
            <span>Industrial Capabilities &amp; OEM Standards</span>
          </div>
          <h1 className="page-hero-title font-serif">
            Precision Manufacturing <span className="text-gold-gradient">Services.</span>
          </h1>
          <p className="page-hero-desc">
            End-to-end jewellery manufacturing solutions engineered for luxury brands, retail houses, 
            and global wholesalers.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding">
        <div className="container">
          <SectionTitle
            badge="Foundry Capabilities"
            title="Comprehensive"
            highlight="Production Divisions"
            description="Click on any manufacturing discipline to request technical specifications, minimum order quantities (MOQ), or contract pricing."
          />

          <div className="services-catalog-grid">
            {servicesData.map((service) => (
              <div key={service.id} className="service-detail-box luxury-card">
                <div className="detail-header">
                  <span className="detail-subtitle">{service.subtitle}</span>
                  <h3 className="detail-title font-serif">{service.title}</h3>
                </div>
                <p className="detail-desc">{service.description}</p>
                <div className="detail-deep-dive">
                  <strong>Engineering Standard:</strong>
                  <p>{service.details}</p>
                </div>
                <div className="detail-actions">
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => handleOpenModal(service)}
                  >
                    <span>Request Service Specifications</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metallurgy Assurance Banner */}
      <section className="metallurgy-section section-padding">
        <div className="container">
          <div className="metallurgy-card luxury-card">
            <div className="metallurgy-grid">
              <div>
                <span className="luxury-badge mb-3">Certified Alloys</span>
                <h2 className="metallurgy-title font-serif">
                  Strict Karatage &amp; Alloy Calibrations
                </h2>
                <p className="metallurgy-desc">
                  We maintain separate induction crucibles for Yellow, Rose, and White gold in 18K (750), 
                  22K (916), and 24K (999.9) fine bullion. Every melt is XRF-assayed prior to casting to ensure 
                  zero cross-contamination.
                </p>
              </div>
              <div className="alloys-list">
                <div className="alloy-item">
                  <div className="alloy-tag">24K (999.9)</div>
                  <p>Fine investment bullion medallions &amp; religious artifacts</p>
                </div>
                <div className="alloy-item">
                  <div className="alloy-tag">22K (916)</div>
                  <p>Standard bridal, nakshi temple jewellery &amp; heavy chains</p>
                </div>
                <div className="alloy-item">
                  <div className="alloy-tag">18K (750)</div>
                  <p>Contemporary diamond pavé jewellery &amp; luxury rings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Modal */}
      <InquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialItem={selectedService}
      />
    </div>
  );
};

export default Services;
