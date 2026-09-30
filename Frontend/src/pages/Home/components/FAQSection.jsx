import React, { useState } from 'react';
import { useLandingPage } from '../../../context/LandingPageContext';

const defaultFaqs = [
  { question: "What is your Minimum Order Quantity (MOQ)?", answer: "Our MOQ depends on the design complexity and weight. Please contact our sales team for detailed information tailored to your specific requirements." },
  { question: "Do you offer custom design services?", answer: "Yes, we specialize in Made-to-Order masterpieces. Our design team can bring your exclusive concepts to life with absolute precision." },
  { question: "Are all your products BIS Hallmarked?", answer: "Absolutely. 100% of our products are BIS Hallmarked to ensure uncompromising purity and authenticity." },
  { question: "Do you export globally?", answer: "Yes, we have a strong global footprint, securely and efficiently exporting our luxury jewelry to discerning clients worldwide." },
  { question: "What is the typical delivery time?", answer: "Delivery times vary by order size and the intricacy of customization. Standard premium orders typically take 2-4 weeks to perfect." }
];

const FAQSection = () => {
  const { settings, loading } = useLandingPage();
  const [openIndex, setOpenIndex] = useState(null);

  const title = settings?.faqs?.title || "FREQUENTLY ASKED QUESTIONS";
  const subtitle = settings?.faqs?.subtitle || "Inquiries";
  const faqs = settings?.faqs?.items?.length > 0 ? settings.faqs.items : defaultFaqs;

  if (loading) return null;

  return (
    <section className="premium-faq-section">
      <div className="premium-faq-container">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h5 style={{ color: '#5C9396', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '15px', fontWeight: '700' }}>{subtitle}</h5>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#19241A', fontWeight: '600', margin: '0' }}>
            {title}
          </h2>
        </div>
        
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className={`premium-faq-item ${openIndex === index ? 'active' : ''}`}>
              <div 
                className="premium-faq-question"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span>{faq.question}</span>
                <span style={{ color: '#5C9396', fontSize: '1.5rem', fontWeight: '400' }}>{openIndex === index ? '−' : '+'}</span>
              </div>
              <div className="premium-faq-answer">
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
