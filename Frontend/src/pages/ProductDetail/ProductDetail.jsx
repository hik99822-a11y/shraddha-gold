import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, ShieldCheck } from 'lucide-react';
import { productCategoriesData } from '../../data/products';
import InquiryModal from '../../components/InquiryModal/InquiryModal';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const foundProduct = productCategoriesData.find(p => p.id === id);
    if (foundProduct) {
      setProduct(foundProduct);
      window.scrollTo(0, 0);
    } else {
      // If product not found, redirect to products page
      navigate('/products');
    }
  }, [id, navigate]);

  if (!product) return <div className="product-detail-loading">Loading...</div>;

  return (
    <div className="product-detail-page bg-white">
      <div className="container py-12">
        <Link to="/products" className="back-link mb-8 inline-flex items-center gap-2 text-muted hover:text-brand-dark transition-fast">
          <ChevronLeft size={16} />
          <span>Back to Collections</span>
        </Link>
        
        <div className="product-detail-grid">
          {/* Image Section */}
          <div className="product-detail-image-wrap">
            <img src={product.image} alt={product.name} className="product-detail-image" />
            <div className="image-overlay-badge">
              <ShieldCheck size={14} className="text-gold" />
              <span>{product.purity}</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="product-detail-info">
            <div className="mb-2">
              <span className="luxury-badge-small">B2B Private Label</span>
            </div>
            <h1 className="product-detail-title font-serif">{product.name}</h1>
            
            <p className="product-detail-desc text-secondary mb-6">
              {product.description}
            </p>

            <div className="product-specs-card mb-8">
              <h4 className="specs-title font-sans">Manufacturing Specifications</h4>
              <ul className="specs-list">
                <li>
                  <Check size={16} className="text-brand-primary" />
                  <span><strong>Metallurgy:</strong> {product.purity}</span>
                </li>
                <li>
                  <Check size={16} className="text-brand-primary" />
                  <span><strong>Details:</strong> {product.specs}</span>
                </li>
                <li>
                  <Check size={16} className="text-brand-primary" />
                  <span><strong>Minimum Order Quantity:</strong> {product.moq}</span>
                </li>
              </ul>
            </div>

            <div className="product-actions flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn btn-brand w-full sm:w-auto"
              >
                Inquire For Wholesale
              </button>
              <Link to="/contact" className="btn btn-outline-brand w-full sm:w-auto text-center">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>

      <InquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialItem={product}
      />
    </div>
  );
};

export default ProductDetail;
