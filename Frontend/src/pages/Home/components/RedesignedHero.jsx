import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import img1 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.25 PM (1).jpeg';
import img2 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.26 PM (2).jpeg';
import img3 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.27 PM (1).jpeg';

const slides = [
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
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section className="redesigned-hero-section">
      {slides.map((slide, index) => (
        <div 
          key={slide.id} 
          className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
        >
          <div 
            className="hero-background-parallax"
            style={{ backgroundImage: `url("${slide.image}")` }}
          ></div>
          <div className="hero-overlay"></div>
          
          <div className="hero-content container">
            <h4 className="hero-subtitle font-sans">{slide.subtitle}</h4>
            <h1 className="hero-title font-serif" dangerouslySetInnerHTML={{ __html: slide.title }}></h1>
            <p className="hero-description font-sans">{slide.description}</p>
            
            <div className="hero-actions">
              <Link to={slide.primaryLink} className="btn hero-primary-btn">
                Shop the Collection
              </Link>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default RedesignedHero;
