import React from 'react';
import RedesignedHero from './components/RedesignedHero';
import FeaturedCategories from './components/FeaturedCategories';
import CompanyOverview from './components/AboutSections/CompanyOverview';
import OurValues from './components/AboutSections/OurValues';
import ManufacturingProcess from './components/AboutSections/ManufacturingProcess';
import OurStrength from './components/AboutSections/OurStrength';
import PresenceShows from './components/AboutSections/PresenceShows';
import UniqueSellingPropositions from './components/AboutSections/UniqueSellingPropositions';
import NewsletterCTA from './components/NewsletterCTA';
import FAQSection from './components/FAQSection';
import LeadFormSection from './components/LeadFormSection';
import './Home.css';
import './components/PremiumStyles.css';

const Home = () => {

  return (
    <div className="landing-page-root">
      <div id="hero"><RedesignedHero /></div>
      <div id="company-overview"><CompanyOverview /></div>
      <div id="our-values"><OurValues /></div>
      <div id="categories"><FeaturedCategories /></div>
      <div id="usp"><UniqueSellingPropositions /></div>
      {/* <div id="manufacturing"><ManufacturingProcess /></div> */}
      <div id="our-strength"><OurStrength /></div>
      <div id="presence"><PresenceShows /></div>
      <div id="faq"><FAQSection /></div>
      <div id="lead-form"><LeadFormSection /></div>
      <div id="newsletter"><NewsletterCTA /></div>
    </div>
  );
};

export default Home;
