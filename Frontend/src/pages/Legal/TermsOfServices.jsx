import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './Legal.css'; 

const TermsOfServices = () => {
  return (
    <div className="legal-page-root section-padding">
      <div className="container max-w-4xl">
        <div className="legal-header text-center mb-10">
          <div className="luxury-badge mx-auto mb-4">
            <ShieldCheck size={14} className="text-gold" />
            <span>Legal Compliance</span>
          </div>
          <h1 className="section-title font-serif">Terms of Services</h1>
          <p className="text-muted">Effective Date: October 2026</p>
        </div>
        
        <div className="legal-content luxury-card p-6 sm:p-10">
          <section className="legal-section">
            <h3 className="font-serif">1. Acceptance of Terms</h3>
            <p>
              By accessing and using the Shraddha Gold India Pvt. Ltd. website and our B2B services, 
              you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">2. Wholesale & B2B Purchasing</h3>
            <p>
              Our primary operations are business-to-business (B2B). Access to detailed pricing, 
              custom tool manufacturing (molds/CADs), and bulk orders require a verified merchant account.
            </p>
            <ul className="legal-list">
              <li>All wholesale orders are subject to minimum order quantities (MOQs).</li>
              <li>Custom mold and proprietary designs remain exclusive to the commissioning client.</li>
              <li>Market gold rates fluctuate daily; final pricing is locked at the time of order confirmation.</li>
            </ul>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">3. Intellectual Property</h3>
            <p>
              All content included on this site, such as text, graphics, logos, images, digital downloads, 
              and CAD renderings, is the property of Shraddha Gold India Pvt. Ltd. or its content suppliers 
              and protected by international copyright laws.
            </p>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">4. Limitation of Liability</h3>
            <p>
              Shraddha Gold India Pvt. Ltd. shall not be liable for any special or consequential damages that result 
              from the use of, or the inability to use, the materials on this site or the performance of the products, 
              even if advised of the possibility of such damages.
            </p>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">5. Governing Law</h3>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of India. 
              Any disputes relating to these terms and conditions will be subject to the exclusive jurisdiction 
              of the courts of Gujarat, India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServices;
