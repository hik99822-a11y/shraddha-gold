import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './Legal.css'; // Shared CSS for legal pages

const PrivacyPolicy = () => {
  return (
    <div className="legal-page-root section-padding">
      <div className="container max-w-4xl">
        <div className="legal-header text-center mb-10">
          <div className="luxury-badge mx-auto mb-4">
            <ShieldCheck size={14} className="text-gold" />
            <span>Legal Compliance</span>
          </div>
          <h1 className="section-title font-serif">Privacy Policy</h1>
          <p className="text-muted">Effective Date: October 2026</p>
        </div>
        
        <div className="legal-content luxury-card p-6 sm:p-10">
          <section className="legal-section">
            <h3 className="font-serif">1. Introduction</h3>
            <p>
              At Shraddha Gold India Pvt. Ltd., we respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we look after your personal data when you visit our website 
              (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">2. The Data We Collect</h3>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="legal-list">
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier, title.</li>
              <li><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
            </ul>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">3. How We Use Your Data</h3>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="legal-list">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">4. Data Security</h3>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, 
              used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data 
              to those employees, agents, contractors and other third parties who have a business need to know.
            </p>
          </section>

          <section className="legal-section mt-6">
            <h3 className="font-serif">5. Contact Us</h3>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact us in the following ways:
            </p>
            <p className="mt-2">
              Email address: privacy@shraddhagold.com<br/>
              Postal address: Shraddha Gold India Pvt. Ltd., Gujarat, India
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
