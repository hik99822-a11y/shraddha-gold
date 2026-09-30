/**
 * Navigation & Header Configuration Data
 * Centralized static data for top navbar, main navigation, and quick links
 */

export const topNavbarData = {
  socials: [
    {
      name: 'Facebook',
      url: 'https://facebook.com/shraddhagold',
      icon: 'Facebook',
      ariaLabel: 'Follow Shraddha Gold on Facebook'
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/shraddhagold',
      icon: 'Instagram',
      ariaLabel: 'Follow Shraddha Gold on Instagram'
    }
  ],
  contact: {
    phone: '+91 98250 12345',
    phoneHref: 'tel:+919825012345',
    email: 'info@shraddhagold.com',
    emailHref: 'mailto:info@shraddhagold.com'
  }
};

export const mainNavLinks = [
  { name: 'Home', path: '/#hero', sectionId: 'hero' },
  { name: 'Company Overview', path: '/#company-overview', sectionId: 'company-overview' },
  { name: 'Our Values', path: '/#our-values', sectionId: 'our-values' },
  { name: 'Categories', path: '/#categories', sectionId: 'categories' },
  { name: 'USPs', path: '/#usp', sectionId: 'usp' },
  // { name: 'Manufacturing Process', path: '/#manufacturing', sectionId: 'manufacturing' },
  { name: 'Our Strength', path: '/#our-strength', sectionId: 'our-strength' },
  { name: 'Exhibitions', path: '/#presence', sectionId: 'presence' }
];

export const footerQuickLinks = [
  { name: 'Home', path: '/#hero', sectionId: 'hero' },
  { name: 'Company Overview', path: '/#company-overview', sectionId: 'company-overview' },
  { name: 'Our Values', path: '/#our-values', sectionId: 'our-values' },
  { name: 'Categories', path: '/#categories', sectionId: 'categories' },
  { name: 'USPs', path: '/#usp', sectionId: 'usp' },
  // { name: 'Manufacturing Process', path: '/#manufacturing', sectionId: 'manufacturing' },
  { name: 'Our Strength', path: '/#our-strength', sectionId: 'our-strength' },
  { name: 'Exhibitions', path: '/#presence', sectionId: 'presence' },
  { name: 'Inquiries', path: '/#faq', sectionId: 'faq' },
  { name: 'Become a Partner', path: '/#lead-form', sectionId: 'lead-form' },
  { name: 'Exclusive Access', path: '/#newsletter', sectionId: 'newsletter' }
  // { name: 'Privacy Policy', path: '/privacy-policy', pageRoute: '/privacy-policy' },
  // { name: 'Terms of Services', path: '/terms-of-services', pageRoute: '/terms-of-services' },
  // { name: 'Login', path: '/login', isAuth: true }
];
