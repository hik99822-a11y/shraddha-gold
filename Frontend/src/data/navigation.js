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
  {
    name: 'Home',
    path: '/',
    sectionId: 'hero'
  },
  {
    name: 'Company Profile',
    path: '/about',
    pageRoute: '/about'
  },
  {
    name: 'Our Products',
    path: '/#products',
    sectionId: 'products',
    pageRoute: '/products'
  },
  {
    name: 'Contact Us',
    path: '/contact',
    pageRoute: '/contact'
  }
];

export const footerQuickLinks = [
  { name: 'Company Profile', path: '/about', pageRoute: '/about' },
  { name: 'Contact Us', path: '/contact', pageRoute: '/contact' },
  { name: 'Privacy Policy', path: '/privacy-policy', pageRoute: '/privacy-policy' },
  { name: 'Terms of Services', path: '/terms-of-services', pageRoute: '/terms-of-services' },
  { name: 'Login', path: '/login', isAuth: true }
];
