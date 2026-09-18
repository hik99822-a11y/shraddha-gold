import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import img1 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.26 PM.jpeg';
import img2 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.27 PM (2).jpeg';
import img3 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.28 PM (1).jpeg';
import img4 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.28 PM.jpeg';

const products = [
  { id: 1, name: 'The Eclipse Ring', price: '₹ 1,25,000', image: img1 },
  { id: 2, name: 'Celestial Pendant', price: '₹ 85,000', image: img2 },
  { id: 3, name: 'Aura Diamond Bangles', price: '₹ 3,40,000', image: img3 },
  { id: 4, name: 'Solitaire Studs', price: '₹ 95,000', image: img4 },
];

const CuratedProductCarousel = ({ onOpenModal }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="curated-products-section section-padding bg-white">
      <div className="container">
        <div className="section-header flex justify-between items-end">
          <div className="text-left">
            <h2 className="section-title">New Arrivals</h2>
            <p className="section-desc">Discover the latest additions to our signature collection.</p>
          </div>
          <div className="carousel-controls">
            <button className="carousel-btn prev" onClick={() => scroll('left')} aria-label="Previous">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button className="carousel-btn next" onClick={() => scroll('right')} aria-label="Next">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
        
        <div className="products-scroll-container" ref={scrollRef}>
          {products.map((product) => (
            <div key={product.id} className="product-card-minimal">
              <div className="product-image-wrap">
                <img src={product.image} alt={product.name} className="product-img" />
                <div className="product-actions-overlay">
                  <button className="btn btn-brand btn-quick-view" onClick={() => onOpenModal && onOpenModal(product)}>
                    Quick View
                  </button>
                </div>
              </div>
              <div className="product-info-minimal">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">{product.price}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-6">
          <Link to="/products" className="btn btn-outline-brand">View All Products</Link>
        </div>
      </div>
    </section>
  );
};

export default CuratedProductCarousel;
