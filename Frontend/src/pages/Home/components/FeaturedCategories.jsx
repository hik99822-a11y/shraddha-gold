import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLandingPage } from '../../../context/LandingPageContext';
import { getImageUrl } from '../../../utils/imageHelper';

const defaultCategories = [
  { name: 'Rings', image: 'https://images.unsplash.com/photo-1592317295760-5c1f677dfc78?auto=format&fit=crop&w=600&q=80', link: '/products?category=rings' },
  { name: 'Bracelets', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80', link: '/products?category=bracelets' },
  { name: 'Watches', image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80', link: '/products?category=watches' },
  { name: 'Necklaces', image: 'https://images.unsplash.com/photo-1585960622850-ed33c41d6418?auto=format&fit=crop&w=600&q=80', link: '/products?category=necklaces' },
];

const CategoryCard = ({ category }) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const images = category.images?.length > 0 ? category.images : (category.image ? [category.image] : []);
  
  React.useEffect(() => {
    if (images.length <= 1 || !isHovered) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [images.length, isHovered]);

  if (images.length === 0) return null;

  return (
    <div 
      className="premium-category-card" 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => {
         setIsHovered(false);
         setCurrentImageIndex(0);
      }}
      style={{ position: 'relative' }}
    >
      <img 
        src={getImageUrl(images[currentImageIndex])} 
        alt={category.name} 
        className="premium-category-img" 
        style={{ transition: 'opacity 0.3s ease' }} 
      />
      <div className="premium-category-info">
        <h3 className="premium-category-name">{category.name}</h3>
      </div>
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '60px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 10 }}>
          {images.map((_, idx) => (
             <div 
               key={idx} 
               style={{ 
                 width: idx === currentImageIndex ? '16px' : '6px', 
                 height: '6px', 
                 borderRadius: '3px', 
                 background: idx === currentImageIndex ? '#ffffff' : 'rgba(255,255,255,0.5)', 
                 transition: 'all 0.3s ease' 
               }} 
             />
          ))}
        </div>
      )}
    </div>
  );
};

const FeaturedCategories = () => {
  const { settings, loading } = useLandingPage();
  const scrollContainerRef = useRef(null);
  const categories = settings?.featuredCategories?.categories?.length > 0 ? settings.featuredCategories.categories : defaultCategories;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) return null;
  return (
    <section className="premium-categories-section">
      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h5 style={{ color: '#5C9396', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '15px', fontWeight: '700' }}>
            {settings?.featuredCategories?.subtitle || 'Collections'}
          </h5>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#19241A', fontWeight: '600', margin: '0 0 20px 0' }}>
            {settings?.featuredCategories?.title || 'SHOP BY CATEGORY'}
          </h2>
          <p style={{ color: '#4a554b', fontSize: '1.1rem' }}>
            {settings?.featuredCategories?.description || 'Explore our signature collections, designed to celebrate every magnificent moment.'}
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginBottom: '20px' }}>
          <button 
            onClick={scrollLeft}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #DCE7E4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer', transition: 'all 0.3s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#F7FAF9'; e.currentTarget.style.borderColor = '#5C9396'; e.currentTarget.style.color = '#5C9396'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DCE7E4'; e.currentTarget.style.color = 'inherit'; }}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={scrollRight}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #DCE7E4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer', transition: 'all 0.3s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#F7FAF9'; e.currentTarget.style.borderColor = '#5C9396'; e.currentTarget.style.color = '#5C9396'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#DCE7E4'; e.currentTarget.style.color = 'inherit'; }}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div 
          ref={scrollContainerRef}
          style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '30px', 
            paddingBottom: '30px', 
            scrollSnapType: 'x mandatory', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }} 
          className="premium-categories-carousel"
        >
          <style>{`
            .premium-categories-carousel::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {categories.map((category, index) => (
            <div 
              key={index} 
              style={{ 
                flex: '0 0 calc(25% - 22.5px)', 
                scrollSnapAlign: 'start', 
                minWidth: '260px' 
              }}
            >
              <CategoryCard category={category} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
