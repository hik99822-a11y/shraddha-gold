import mongoose from 'mongoose';

const landingPageSchema = new mongoose.Schema({
  general: {
    contactEmail: { type: String, default: 'info@shraddhagold.com' },
    contactPhone: { type: String, default: '+91 76006 19325' },
    address: { type: String, default: 'Plot 42, SEZ Jewellery Manufacturing Zone, Andheri East, Mumbai — 400096, Maharashtra, India' },
    facebookLink: { type: String, default: '#' },
    instagramLink: { type: String, default: '#' },
    whatsappNumber: { type: String, default: '+917600619325' },
    footerCompanyName: { type: String, default: "SHRADDHA GOLD'S INDIA PVT LTD" },
    footerDescription: { type: String, default: 'Exquisite jewelry crafted with passion and precision. A legacy of purity, trust, and unparalleled artistry since 2023.' },
    footerCopyrightText: { type: String, default: "© SHRADDHA GOLD'S INDIA PVT LTD | Since 2023" }
  },
  hero: {
    slides: [{ 
      image: { type: String, default: '' },
      title: { type: String, default: '' }, 
      subtitle: { type: String, default: '' }, 
      description: { type: String, default: '' } 
    }]
  },
  companyOverview: {
    title: { type: String, default: 'COMPANY OVERVIEW' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  ourValues: {
    items: [{
      number: { type: String, default: '' },
      title: { type: String, default: '' },
      subtitle: { type: String, default: '' },
      description: { type: String, default: '' }
    }]
  },
  usps: {
    items: [{ 
      title: { type: String, default: '' }, 
      description: { type: String, default: '' }, 
      image: { type: String, default: '' } 
    }]
  },
  manufacturing: {
    steps: [{ 
      title: { type: String, default: '' }, 
      description: { type: String, default: '' }, 
      image: { type: String, default: '' } 
    }]
  },
  exhibitions: {
    images: [{ type: String }],
    events: [{ 
      title: { type: String, default: '' }, 
      description: { type: String, default: '' } 
    }]
  },
  featuredCategories: {
    title: { type: String, default: 'SHOP BY CATEGORY' },
    subtitle: { type: String, default: 'Collections' },
    description: { type: String, default: 'Explore our signature collections, designed to celebrate every magnificent moment.' },
    categories: [{
      name: { type: String, default: '' },
      image: { type: String, default: '' },
      images: [{ type: String }]
    }]
  },
  strengths: {
    title: { type: String, default: 'OUR STRENGTH' },
    subtitle: { type: String, default: 'Why Choose Us' },
    items: [{
      title: { type: String, default: '' },
      description: { type: String, default: '' }
    }]
  },
  faqs: {
    title: { type: String, default: 'FREQUENTLY ASKED QUESTIONS' },
    subtitle: { type: String, default: 'Inquiries' },
    items: [{
      question: { type: String, default: '' },
      answer: { type: String, default: '' }
    }]
  }
}, { timestamps: true });

const LandingPage = mongoose.model('LandingPage', landingPageSchema);
export default LandingPage;
