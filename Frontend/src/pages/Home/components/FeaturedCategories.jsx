import React from 'react';
import { Link } from 'react-router-dom';
import img1 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.25 PM.jpeg';
import img2 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.26 PM (2).jpeg';
import img3 from '../../../assets/WhatsApp Image 2026-09-10 at 12.34.27 PM (1).jpeg';

const categories = [
  { id: 1, name: 'Rings', image: img1, link: '/products?category=rings' },
  { id: 2, name: 'Necklaces', image: img2, link: '/products?category=necklaces' },
  { id: 3, name: 'Earrings', image: img3, link: '/products?category=earrings' },
];

const FeaturedCategories = () => {
  return (
    <section className="featured-categories-section section-padding bg-white">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Shop by Category</h2>
          <p className="section-desc">Explore our signature collections, designed to celebrate every moment.</p>
        </div>
        
        <div className="categories-grid">
          {categories.map((category) => (
            <Link to={category.link} key={category.id} className="category-card">
              <div className="category-image-wrap">
                <img src={category.image} alt={category.name} className="category-img" />
              </div>
              <div className="category-info-clean">
                <h3 className="category-name-clean">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
