import React, { useState } from 'react';
import RedesignedHero from './components/RedesignedHero';
import FeaturedCategories from './components/FeaturedCategories';
import CuratedProductCarousel from './components/CuratedProductCarousel';
import CampaignBanner from './components/CampaignBanner';
import NewsletterCTA from './components/NewsletterCTA';
import InquiryModal from '../../components/InquiryModal/InquiryModal';
import './Home.css';

const Home = () => {
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (item) => {
    setSelectedItemForModal(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItemForModal(null);
  };

  return (
    <div className="landing-page-root">
      <RedesignedHero />
      <FeaturedCategories />
      <CuratedProductCarousel onOpenModal={handleOpenModal} />
      <CampaignBanner />
      <NewsletterCTA />

      <InquiryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedItemForModal}
      />
    </div>
  );
};

export default Home;
