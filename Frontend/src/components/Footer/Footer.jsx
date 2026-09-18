import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Instagram, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { productCategoriesData } from '../../data/products';
import { footerQuickLinks, topNavbarData } from '../../data/navigation';
import { companyData } from '../../data/company';
import { contactData } from '../../data/contact';
import './Footer.css';

const Footer = () => {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '';

  const handleLinkClick = (e, link) => {
    if (link.path.startsWith('/#') && isHome) {
      e.preventDefault();
      const targetId = link.path.replace('/#', '');
      const el = document.getElementById(targetId);
      if (el) {
        if (window.lenis) {
          window.lenis.scrollTo(el, { offset: -80 });
        } else {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        window.history.pushState(null, '', `#${targetId}`);
      }
    }
  };

  return (
    <footer className="site-footer-root">
      {/* =====================================================================
          MAIN FOOTER (4 Distinct Strategic Columns)
          ===================================================================== */}
      <div className="footer-main-container container">
        <div className="footer-columns-grid">
          {/* -----------------------------------------------------------------
              COLUMN 1 — COMPANY
              ----------------------------------------------------------------- */}
          <div className="footer-col footer-col-company">
            <Link to="/" className="footer-brand-link" aria-label="Shraddha Gold Home">
              <img
                src="/assets/images/Shraddha Gold India Pvt. Ltd. - White.png"
                alt="Shraddha Gold India Pvt. Ltd."
                className="footer-brand-logo"
              />
            </Link>

            <h3 className="footer-company-name">{companyData.name}</h3>
            
            <p className="footer-company-desc">
              {companyData.brochureSummary}
            </p>

            <div className="footer-accreditation-pill">
              <ShieldCheck size={16} className="accreditation-icon" />
              <span>Government Approved BIS Hallmarked Facility</span>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              COLUMN 2 — LINKS
              ----------------------------------------------------------------- */}
          <div className="footer-col footer-col-links">
            <h4 className="footer-heading">Links</h4>
            <ul className="footer-link-list">
              {footerQuickLinks.map((link) => (
                <li key={link.name} className="footer-link-item">
                  {link.path.startsWith('#') ? (
                    <a href={link.path} className="footer-nav-anchor">
                      <span>{link.name}</span>
                      <ArrowUpRight size={13} className="footer-arrow-icon" />
                    </a>
                  ) : (
                    <Link
                      to={link.path}
                      onClick={(e) => handleLinkClick(e, link)}
                      className={`footer-nav-anchor ${link.isAuth ? 'footer-login-highlight' : ''}`}
                    >
                      <span>{link.name}</span>
                      <ArrowUpRight size={13} className="footer-arrow-icon" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* -----------------------------------------------------------------
              COLUMN 3 — OUR PRODUCTS (Dynamically rendered from product data)
              ----------------------------------------------------------------- */}
          <div className="footer-col footer-col-products">
            <h4 className="footer-heading">Our Products</h4>
            <ul className="footer-link-list">
              {productCategoriesData.slice(0, 7).map((prod) => (
                <li key={prod.id} className="footer-link-item">
                  <Link
                    to={`/product/${prod.id}`}
                    onClick={() => {
                      if (window.lenis) {
                        window.lenis.scrollTo(0, { immediate: true });
                      } else {
                        window.scrollTo(0, 0);
                      }
                    }}
                    className="footer-nav-anchor"
                  >
                    <span>{prod.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* -----------------------------------------------------------------
              COLUMN 4 — CONTACT DETAILS
              ----------------------------------------------------------------- */}
          <div className="footer-col footer-col-contact">
            <h4 className="footer-heading">Contact Details</h4>
            
            <div className="footer-contact-block">
              <div className="footer-contact-entry">
                <div className="contact-icon-bubble">
                  <MapPin size={16} />
                </div>
                <div className="contact-entry-content">
                  <span className="contact-entry-title">Location</span>
                  <p className="contact-entry-text">{contactData.address.full}</p>
                </div>
              </div>

              <div className="footer-contact-entry">
                <div className="contact-icon-bubble">
                  <Phone size={16} />
                </div>
                <div className="contact-entry-content">
                  <span className="contact-entry-title">Phone</span>
                  <a href={contactData.phones[0].href} className="contact-entry-link">
                    {contactData.phones[0].number}
                  </a>
                </div>
              </div>

              <div className="footer-contact-entry">
                <div className="contact-icon-bubble">
                  <Mail size={16} />
                </div>
                <div className="contact-entry-content">
                  <span className="contact-entry-title">Email</span>
                  <a href={contactData.emails[0].href} className="contact-entry-link">
                    {contactData.emails[0].email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          POST-FOOTER / COPYRIGHT BAR (Section 30 Master Prompt Specification)
          ===================================================================== */}
      <div className="post-footer-bar">
        <div className="container post-footer-inner">
          {/* Left Side: Company Name + Established Year */}
          <div className="post-footer-left">
            <span className="copyright-brand">© {companyData.name}</span>
            <span className="copyright-divider">|</span>
            <span className="established-tag">Since {companyData.establishedYear}</span>
          </div>

          {/* Right Side: Clickable Facebook | Instagram */}
          <div className="post-footer-right">
            <a
              href={topNavbarData.socials[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="post-footer-social-link"
              aria-label="Visit Shraddha Gold Facebook"
            >
              <Facebook size={14} className="social-icon" />
              <span>Facebook</span>
            </a>
            <span className="social-pipe">|</span>
            <a
              href={topNavbarData.socials[1].url}
              target="_blank"
              rel="noopener noreferrer"
              className="post-footer-social-link"
              aria-label="Visit Shraddha Gold Instagram"
            >
              <Instagram size={14} className="social-icon" />
              <span>Instagram</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
