import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLandingPage } from '../../../context/LandingPageContext';
import img1 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.25 PM (1).jpeg';
import img2 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.26 PM (2).jpeg';
import img3 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.27 PM (1).jpeg';
import { getImageUrl } from '../../../utils/imageHelper';

const defaultSlides = [
  {
    id: 1,
    image: img1,
    subtitle: 'New Collection',
    title: 'Elegance Crafted<br/>For Eternity',
    description: 'Discover our latest arrivals featuring meticulous craftsmanship and timeless design.',
    primaryLink: '/products',
    secondaryLink: '/contact',
  },
  {
    id: 2,
    image: img2,
    subtitle: 'Bridal Exclusive',
    title: 'Your Perfect<br/>Forever',
    description: 'Explore the signature bridal collection for your special day.',
    primaryLink: '/products?category=bridal',
    secondaryLink: '/contact',
  },
  {
    id: 3,
    image: img3,
    subtitle: 'Everyday Luxury',
    title: 'Brilliance in<br/>Every Moment',
    description: 'Subtle elegance designed to elevate your everyday style.',
    primaryLink: '/products?category=everyday',
    secondaryLink: '/about',
  }
];

const RedesignedHero = () => {
  const { settings, loading } = useLandingPage();
  const [currentSlide, setCurrentSlide] = useState(0);

  const activeSlides = settings?.hero?.slides?.length > 0 ? settings.hero.slides : defaultSlides;

  useEffect(() => {
    if (activeSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeSlides]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);

  return (
    <section className="redesigned-hero-section">
      {activeSlides.map((slide, index) => (
        <div 
          key={slide.id || index} 
          className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
        >
          <div 
            className="hero-background-parallax"
            style={{ backgroundImage: `url("${getImageUrl(slide.image)}")` }}
          ></div>
          <div className="hero-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}></div>
          
          <div className="hero-content container">
            <h4 className="hero-subtitle font-sans" style={{ color: '#FFFFFF', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{slide.subtitle}</h4>
            <h1 className="hero-title font-serif" style={{ color: '#FFFFFF', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }} dangerouslySetInnerHTML={{ __html: slide.title }}></h1>
            <p className="hero-description font-sans" style={{ color: '#F8F9FA', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>{slide.description}</p>
            
            {/* <div className="hero-actions" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <Link to={slide.primaryLink} className="btn hero-primary-btn">
                Add to Cart
              </Link>
              <a href="https://wa.me/917600619325" target="_blank" rel="noopener noreferrer" className="btn hero-secondary-btn" style={{ backgroundColor: 'transparent', border: '1px solid #FFFFFF', color: '#FFFFFF' }}>
                Enquire on WhatsApp
              </a>
            </div> */}
          </div>
        </div>
      ))}
    </section>
  );
};

export default RedesignedHero;
