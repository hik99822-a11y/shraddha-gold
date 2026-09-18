import React, { useState } from 'react';
import { Gem, Filter, ArrowUpRight } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import ProductCard from '../../components/ProductCard/ProductCard';
import InquiryModal from '../../components/InquiryModal/InquiryModal';
import { productCategoriesData } from '../../data/products';
import './Products.css';

const Products = () => {
  const [selectedPurityFilter, setSelectedPurityFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filters = ['All', '22K', '18K', '24K'];

  const filteredProducts = selectedPurityFilter === 'All'
    ? productCategoriesData
    : productCategoriesData.filter((p) => p.purity.includes(selectedPurityFilter));

  const handleOpenModal = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  return (
    <div className="products-page-root">
      {/* Page Header Banner */}
      <section className="page-hero-banner">
        <div className="container">
          <div className="luxury-badge mb-3">
            <Gem size={12} className="text-gold" />
            <span>Commercial Jewellery Categories</span>
          </div>
          <h1 className="page-hero-title font-serif">
            Manufactured <span className="text-gold-gradient">Gold Categories.</span>
          </h1>
          <p className="page-hero-desc">
            B2B catalogue representing precision-cast, machine-drawn, and hand-chiseled jewellery lines 
            available for private-label order production and contract batch manufacturing.
          </p>
        </div>
      </section>

      {/* Main Catalog Section */}
      <section className="section-padding">
        <div className="container">
          {/* Purity Filter Controls */}
          <div className="catalog-toolbar">
            <div className="toolbar-left">
              <span className="showing-count">
                Showing <strong>{filteredProducts.length}</strong> Jewellery Categories
              </span>
            </div>
            <div className="purity-filters">
              <span className="filter-label">Filter Metallurgy:</span>
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedPurityFilter(f)}
                  className={`purity-filter-btn ${selectedPurityFilter === f ? 'active' : ''}`}
                >
                  {f === 'All' ? 'All Purities' : `${f} Standard`}
                </button>
              ))}
            </div>
          </div>

          {/* Product Categories Grid */}
          <div className="products-showcase-grid">
            {filteredProducts.map((category) => (
              <ProductCard
                key={category.id}
                category={category}
                onExplore={(c) => handleOpenModal(c)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* B2B Private Label Notice */}
      <section className="section-padding b2b-spec-notice">
        <div className="container">
          <div className="spec-notice-card luxury-card">
            <h3 className="spec-notice-title font-serif">Custom Tooling &amp; Exclusive Brand Molds</h3>
            <p className="spec-notice-desc">
              Have proprietary CAD models or sketch books? We construct dedicated rubber and silicone molds 
              with guaranteed client exclusivity. Serialized casting tree tags ensure your designs are never duplicated.
            </p>
            <button
              onClick={() => handleOpenModal({ name: 'Proprietary B2B Mold Program' })}
              className="btn btn-gold"
            >
              Inquire About Exclusive Tooling
            </button>
          </div>
        </div>
      </section>

      {/* Modal */}
      <InquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialItem={selectedCategory}
      />
    </div>
  );
};

export default Products;
